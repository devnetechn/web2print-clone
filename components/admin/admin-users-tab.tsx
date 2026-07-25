"use client"

import { useState, useEffect, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { AlertCircle, Check, KeyRound, Loader2, Mail, Trash2, UserPlus, Users } from "lucide-react"
import {
  listAdminUsers,
  changeAdminPassword,
  changeOwnPassword,
  changeAdminEmail,
  grantAdmin,
  revokeAdmin,
  type AdminUser,
} from "@/app/actions/admin-users"

// Feedback is rendered inline rather than through useToast: <Toaster /> is not
// mounted anywhere in the app, so toast() calls render nothing at all. Inline
// messages work regardless of that.
type Notice = { kind: "success" | "error"; text: string } | null

function initials(user: AdminUser) {
  const source = user.full_name?.trim() || user.email
  return source.slice(0, 2).toUpperCase()
}

export function AdminUsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice>(null)
  const [pending, startTransition] = useTransition()

  // Which row has an open form, and which of the two it is. Only one at a time
  // so a half-typed password can't be submitted against the wrong account.
  const [editing, setEditing] = useState<{ id: string; mode: "password" | "email" } | null>(null)
  const [fieldValue, setFieldValue] = useState("")
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
  const [newAdminEmail, setNewAdminEmail] = useState("")

  async function refresh() {
    const result = await listAdminUsers()
    if (result.error) {
      setLoadError(result.error)
    } else {
      setUsers(result.users)
      setLoadError(null)
    }
    setLoading(false)
  }

  useEffect(() => {
    refresh()
  }, [])

  function closeForms() {
    setEditing(null)
    setFieldValue("")
    setConfirmRemove(null)
  }

  function run(action: () => Promise<{ success: boolean; error?: string }>, successText: string) {
    setNotice(null)
    startTransition(async () => {
      const result = await action()
      if (result.success) {
        setNotice({ kind: "success", text: successText })
        closeForms()
        setNewAdminEmail("")
        await refresh()
      } else {
        setNotice({ kind: "error", text: result.error || "Something went wrong" })
      }
    })
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-12 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading admin users…
        </CardContent>
      </Card>
    )
  }

  if (loadError) {
    return (
      <Card>
        <CardContent className="flex gap-3 py-8">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          <div>
            <p className="font-medium text-red-900">Could not load admin users</p>
            <p className="text-sm text-red-800">{loadError}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin Users</CardTitle>
        <CardDescription>
          Anyone listed here can reach every page under /admin. Access is all or nothing — there are
          no partial roles yet.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {notice && (
          <div
            className={`flex gap-3 rounded-lg border p-3 text-sm ${
              notice.kind === "success"
                ? "border-green-200 bg-green-50 text-green-900"
                : "border-red-200 bg-red-50 text-red-900"
            }`}
          >
            {notice.kind === "success" ? (
              <Check className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{notice.text}</span>
          </div>
        )}

        <div className="space-y-3">
          {users.map((user) => (
            <div key={user.id} className="rounded-lg border">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                    <span className="text-sm font-medium text-slate-600">{initials(user)}</span>
                  </div>
                  <div>
                    <p className="font-medium">
                      {user.full_name || "—"}
                      {user.is_self && (
                        <Badge variant="secondary" className="ml-2 align-middle">
                          You
                        </Badge>
                      )}
                    </p>
                    <p className="text-sm text-slate-500">{user.email}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={pending}
                    onClick={() => {
                      setFieldValue("")
                      setConfirmRemove(null)
                      setEditing(
                        editing?.id === user.id && editing.mode === "password"
                          ? null
                          : { id: user.id, mode: "password" },
                      )
                    }}
                  >
                    <KeyRound className="h-4 w-4" />
                    Password
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={pending}
                    onClick={() => {
                      setFieldValue(user.email)
                      setConfirmRemove(null)
                      setEditing(
                        editing?.id === user.id && editing.mode === "email"
                          ? null
                          : { id: user.id, mode: "email" },
                      )
                    }}
                  >
                    <Mail className="h-4 w-4" />
                    Email
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                    // Self-removal locks you out of the page you are on, and
                    // the server rejects it anyway — disabling says so before
                    // the click rather than after.
                    disabled={pending || user.is_self || users.length <= 1}
                    title={
                      user.is_self
                        ? "You cannot remove your own admin access"
                        : users.length <= 1
                          ? "Cannot remove the last admin"
                          : undefined
                    }
                    onClick={() => {
                      setEditing(null)
                      setConfirmRemove(confirmRemove === user.id ? null : user.id)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </Button>
                </div>
              </div>

              {editing?.id === user.id && (
                <div className="border-t bg-slate-50 p-4">
                  <Label htmlFor={`field-${user.id}`} className="text-sm">
                    {editing.mode === "password" ? "New password" : "New email address"}
                  </Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Input
                      id={`field-${user.id}`}
                      type={editing.mode === "password" ? "password" : "email"}
                      value={fieldValue}
                      onChange={(e) => setFieldValue(e.target.value)}
                      placeholder={editing.mode === "password" ? "At least 10 characters" : "name@example.com"}
                      className="max-w-sm bg-white"
                      autoComplete={editing.mode === "password" ? "new-password" : "email"}
                    />
                    <Button
                      size="sm"
                      disabled={pending || !fieldValue.trim()}
                      onClick={() =>
                        run(
                          () =>
                            editing.mode === "email"
                              ? changeAdminEmail(user.id, fieldValue)
                              : // Changing your own password goes through the
                                // session-aware path so you stay logged in;
                                // the admin API route would leave this tab
                                // holding a session for the old credentials.
                                user.is_self
                                ? changeOwnPassword(fieldValue)
                                : changeAdminPassword(user.id, fieldValue),
                          editing.mode === "password"
                            ? `Password updated for ${user.email}`
                            : `Email updated to ${fieldValue.trim().toLowerCase()}`,
                        )
                      }
                    >
                      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                    </Button>
                    <Button variant="ghost" size="sm" disabled={pending} onClick={closeForms}>
                      Cancel
                    </Button>
                  </div>
                  {editing.mode === "password" && (
                    <p className="mt-2 text-xs text-slate-500">
                      The new password takes effect immediately. Tell them out of band — this screen
                      does not email it to them.
                    </p>
                  )}
                </div>
              )}

              {confirmRemove === user.id && (
                <div className="border-t bg-red-50 p-4">
                  <p className="text-sm text-red-900">
                    Remove admin access for <span className="font-medium">{user.email}</span>? Their
                    account and past orders stay — they just lose access to /admin.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={pending}
                      onClick={() => run(() => revokeAdmin(user.id), `Removed admin access for ${user.email}`)}
                    >
                      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove access"}
                    </Button>
                    <Button variant="ghost" size="sm" disabled={pending} onClick={closeForms}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {users.length === 0 && (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-slate-500">
              No admin users found.
            </p>
          )}
        </div>

        <Separator />

        <div>
          <h3 className="flex items-center gap-2 font-medium">
            <UserPlus className="h-4 w-4" />
            Add an admin
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            They sign up on the storefront first, then enter that email here. This screen does not
            create accounts — picking a password on someone&apos;s behalf is how shared logins start.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Input
              type="email"
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
              placeholder="name@example.com"
              className="max-w-sm"
              autoComplete="off"
            />
            <Button
              className="gap-2"
              disabled={pending || !newAdminEmail.trim()}
              onClick={() =>
                run(() => grantAdmin(newAdminEmail), `${newAdminEmail.trim().toLowerCase()} is now an admin`)
              }
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
              Grant admin
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
