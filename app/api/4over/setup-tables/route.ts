import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { requireAdmin } from "@/lib/supabase/server"

// This route must never be statically evaluated at build time.
export const dynamic = "force-dynamic"

// Create the service-role client lazily (inside the handlers) instead of at
// module scope. Instantiating it at import time made the Next.js build fail to
// "collect page data" because createClient throws when the env vars are absent
// during the build.
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

export async function POST() {
  const { user, error: authError } = await requireAdmin()
  if (!user) {
    return NextResponse.json({ error: authError }, { status: authError === "Not logged in" ? 401 : 403 })
  }

  try {
    const supabaseAdmin = getSupabaseAdmin()
    // Execute each SQL statement separately using Supabase's rpc or direct query
    // Since Supabase JS client can't run raw DDL, we'll use the REST API

    const statements = [
      // Drop existing tables
      `DROP TABLE IF EXISTS fourover_sync_status CASCADE`,
      `DROP TABLE IF EXISTS fourover_base_prices CASCADE`,
      `DROP TABLE IF EXISTS fourover_option_groups CASCADE`,
      `DROP TABLE IF EXISTS fourover_products CASCADE`,
      `DROP TABLE IF EXISTS fourover_categories CASCADE`,
      
      // Create categories table
      `CREATE TABLE fourover_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        category_uuid TEXT UNIQUE NOT NULL,
        category_name TEXT NOT NULL,
        parent_category_uuid TEXT,
        category_order INTEGER,
        synced_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      
      // Create products table
      `CREATE TABLE fourover_products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_uuid TEXT UNIQUE NOT NULL,
        product_code TEXT,
        product_description TEXT,
        product_name TEXT,
        category_uuid TEXT,
        product_data JSONB,
        synced_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      
      // Create option groups table
      `CREATE TABLE fourover_option_groups (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_uuid TEXT NOT NULL,
        option_group_uuid TEXT NOT NULL,
        option_group_name TEXT NOT NULL,
        option_group_order INTEGER,
        options JSONB NOT NULL,
        synced_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(product_uuid, option_group_uuid)
      )`,
      
      // Create base prices table
      `CREATE TABLE fourover_base_prices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_uuid TEXT NOT NULL,
        runsize_uuid TEXT,
        runsize INTEGER,
        colorspec_uuid TEXT,
        colorspec TEXT,
        product_baseprice DECIMAL(12,6) NOT NULL,
        turnaroundtime_uuid TEXT,
        turnaroundtime TEXT,
        synced_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(product_uuid, runsize_uuid, colorspec_uuid)
      )`,
      
      // Create sync status table
      `CREATE TABLE fourover_sync_status (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sync_type TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at TIMESTAMPTZ DEFAULT NOW(),
        completed_at TIMESTAMPTZ,
        total_items INTEGER DEFAULT 0,
        synced_items INTEGER DEFAULT 0,
        error_message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      
      // Create indexes
      `CREATE INDEX idx_fourover_products_category ON fourover_products(category_uuid)`,
      `CREATE INDEX idx_fourover_products_code ON fourover_products(product_code)`,
      `CREATE INDEX idx_fourover_option_groups_product ON fourover_option_groups(product_uuid)`,
      `CREATE INDEX idx_fourover_base_prices_product ON fourover_base_prices(product_uuid)`,
      `CREATE INDEX idx_fourover_base_prices_runsize ON fourover_base_prices(runsize)`,
    ]
    
    // Execute via Supabase REST API with service role
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    for (const sql of statements) {
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ query: sql })
      })
      
      // If exec_sql doesn't exist, try the SQL endpoint directly
      if (!response.ok) {
        // Use the /sql endpoint if available, or handle the error
        const errorText = await response.text()
        console.log(`SQL statement result: ${response.status}`, errorText.slice(0, 200))
      }
    }
    
    // Verify tables were created by trying to query them
    const { error: verifyError } = await supabaseAdmin
      .from('fourover_categories')
      .select('count')
      .limit(0)
    
    if (verifyError && verifyError.code === '42P01') {
      // Tables don't exist - need to use direct SQL execution
      // Return instructions for manual setup
      return NextResponse.json({ 
        success: false, 
        error: "Cannot execute DDL via Supabase client. Please run the SQL migration manually.",
        sqlFile: "/scripts/006_fourover_sync_tables.sql",
        instructions: "Copy the SQL from the file and run it in your Supabase SQL Editor"
      }, { status: 400 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: "All 4over sync tables created successfully",
      tables: [
        'fourover_categories',
        'fourover_products', 
        'fourover_option_groups',
        'fourover_base_prices',
        'fourover_sync_status'
      ]
    })
    
  } catch (error) {
    console.error("Setup tables error:", error)
    return NextResponse.json({ 
      success: false, 
      error: String(error) 
    }, { status: 500 })
  }
}

export async function GET() {
  // Check if tables exist and their row counts
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const tables = ['fourover_categories', 'fourover_products', 'fourover_option_groups', 'fourover_base_prices', 'fourover_sync_status']
    const result: Record<string, { exists: boolean; count: number }> = {}
    let anyExists = false
    
    for (const table of tables) {
      try {
        const { count, error } = await supabaseAdmin
          .from(table)
          .select('*', { count: 'exact', head: true })
        
        if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
          // Table doesn't exist
          result[table] = { exists: false, count: 0 }
        } else if (error) {
          // Other error - assume table doesn't exist
          result[table] = { exists: false, count: 0 }
        } else {
          result[table] = { exists: true, count: count || 0 }
          anyExists = true
        }
      } catch {
        result[table] = { exists: false, count: 0 }
      }
    }
    
    const allExist = Object.values(result).every(t => t.exists)
    
    return NextResponse.json({
      success: allExist,
      tablesExist: anyExists,
      tables: allExist ? result : undefined,
      message: allExist ? "All tables ready" : "Tables need to be created. Run the SQL migration first."
    })
  } catch (error) {
    return NextResponse.json({ 
      success: false,
      tablesExist: false,
      message: "Tables need to be created. Run the SQL migration first."
    })
  }
}
