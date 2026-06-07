"use client"

import { useState } from "react"
import Link from "next/link"
import { Shield, RefreshCw, Clock, Award, Monitor, Smartphone, FileText, Mail, Edit, TrendingUp, Users, Zap, Target, ChevronDown, Check } from "lucide-react"
import { Button } from "@/components/ui/button"

const faqs = [
  {
    question: "How long does it take to build my website?",
    answer: "Landing pages are typically completed in 3-5 business days, while multi-page websites take 7-14 business days. Rush delivery options are available for an additional fee."
  },
  {
    question: "What if I need changes after the website is completed?",
    answer: "All packages include revisions during the development process. After launch, we offer maintenance packages or you can request changes on an hourly basis."
  },
  {
    question: "Do you provide hosting and domain registration?",
    answer: "Yes! We can help you register a domain and set up reliable hosting. We work with industry-leading providers to ensure your website is fast and secure."
  },
  {
    question: "Can I update the website content myself later?",
    answer: "We build websites on user-friendly platforms that allow you to make content updates easily. We also provide training and documentation to help you manage your site."
  },
  {
    question: "What happens if I need technical support after launch?",
    answer: "We offer ongoing support and maintenance packages. For quick questions, we provide email support. For more extensive needs, we have monthly maintenance plans available."
  },
  {
    question: "Do you write the content for my website?",
    answer: "Yes! All packages include done-for-you content creation. We research your industry, write compelling copy, and submit it for your approval before publishing."
  },
  {
    question: "Will my website work on mobile devices?",
    answer: "Every website we create is fully responsive and optimized for mobile devices, tablets, and desktops. We test on multiple devices to ensure a perfect experience."
  },
  {
    question: "What if I am not satisfied with the website?",
    answer: "We offer unlimited revisions during the development process and a 100% satisfaction guarantee. We will work with you until you are completely happy with your website."
  }
]

export default function WebsiteDesignPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="min-h-screen font-sans">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 via-purple-50 to-white py-16 lg:py-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-6 text-balance">
                WEB SITES THAT CONVERT VISITORS INTO CLIENTS
              </h1>
              <p className="text-lg md:text-xl text-gray-700 leading-relaxed mb-8">
                We build done-for-you, conversion-focused websites for service businesses and startups. 
                Get a professional website that makes you look established and helps you win more clients.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button asChild size="lg" className="rounded-full px-8 py-6 text-base font-bold bg-blue-600 hover:bg-blue-700">
                  <a href="#pricing">Start My Website Setup</a>
                </Button>
                <Button asChild variant="outline" size="lg" className="rounded-full px-8 py-6 text-base font-bold border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white">
                  <Link href="/contact">Book a Strategy Call</Link>
                </Button>
              </div>
            </div>
            <div>
              <div className="relative aspect-[4/3] rounded-2xl border-4 border-white shadow-2xl overflow-hidden hover:scale-[1.02] transition-transform">
                <img 
                  src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop"
                  alt="Professional website mockup showing conversion funnels and automation"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Signals */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">100% Satisfaction Guarantee</h3>
              <p className="text-sm text-gray-500">We&apos;ll work with you until you&apos;re completely happy with your website</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                <RefreshCw className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Free Revisions</h3>
              <p className="text-sm text-gray-500">Unlimited revisions included in your package until it&apos;s perfect</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                <Clock className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Fast Turnaround</h3>
              <p className="text-sm text-gray-500">Most projects completed within 7-14 business days</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                <Award className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Professional Quality</h3>
              <p className="text-sm text-gray-500">Industry-standard design and development practices</p>
            </div>
          </div>
        </div>
      </section>

      {/* What You Get Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900 text-balance">
              What&apos;s Included in Your Website Build
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="border-2 border-gray-200 rounded-2xl p-6 hover:border-blue-600 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-blue-600/10 flex items-center justify-center mb-4">
                <Monitor className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Professional Design</h3>
              <p className="text-gray-500">Clean, modern layout that makes your business look established.</p>
            </div>
            <div className="border-2 border-gray-200 rounded-2xl p-6 hover:border-blue-600 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-blue-600/10 flex items-center justify-center mb-4">
                <Smartphone className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Mobile & SEO Ready</h3>
              <p className="text-gray-500">Optimized so clients can find you and use your site on any device.</p>
            </div>
            <div className="border-2 border-gray-200 rounded-2xl p-6 hover:border-blue-600 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-blue-600/10 flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Service Pages That Sell</h3>
              <p className="text-gray-500">Clear Home, About, and Services pages that explain what you do.</p>
            </div>
            <div className="border-2 border-gray-200 rounded-2xl p-6 hover:border-blue-600 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-blue-600/10 flex items-center justify-center mb-4">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Lead Capture & Automations</h3>
              <p className="text-gray-500">Contact forms and basic follow-up so you don&apos;t lose leads.</p>
            </div>
            <div className="border-2 border-gray-200 rounded-2xl p-6 hover:border-blue-600 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-blue-600/10 flex items-center justify-center mb-4">
                <Edit className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Done-For-You Content</h3>
              <p className="text-gray-500">We create professional content for your website and submit it for your approval before going live.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Results Section */}
      <section className="py-20 bg-gradient-to-br from-blue-600 to-blue-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mb-4 text-balance">
              Websites Built for Results
            </h2>
            <p className="text-blue-200 text-lg max-w-2xl mx-auto">
              Our websites are designed with conversion in mind, helping businesses grow their online presence
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white/10 backdrop-blur rounded-2xl p-8 text-center">
              <TrendingUp className="w-12 h-12 text-white mx-auto mb-4" />
              <div className="text-4xl font-bold text-white mb-2">40%</div>
              <p className="text-blue-200">Average Lead Increase</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-2xl p-8 text-center">
              <Users className="w-12 h-12 text-white mx-auto mb-4" />
              <div className="text-4xl font-bold text-white mb-2">95%</div>
              <p className="text-blue-200">Client Satisfaction Rate</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-2xl p-8 text-center">
              <Zap className="w-12 h-12 text-white mx-auto mb-4" />
              <div className="text-4xl font-bold text-white mb-2">3-5 Days</div>
              <p className="text-blue-200">Average Launch Time</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-2xl p-8 text-center">
              <Target className="w-12 h-12 text-white mx-auto mb-4" />
              <div className="text-4xl font-bold text-white mb-2">100%</div>
              <p className="text-blue-200">Mobile Responsive</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4 text-balance">
              How It Works
            </h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              From setup to launch in three simple steps
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl font-bold mb-4">1</div>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">Start Your Setup</h3>
              <p className="text-gray-500">Secure your spot with payment and get instant access to our onboarding portal.</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl font-bold mb-4">2</div>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">Share Your Details</h3>
              <p className="text-gray-500">Simple onboarding form where you send copy, logos, and preferences.</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl font-bold mb-4">3</div>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">We Build & Launch</h3>
              <p className="text-gray-500">Web2Print USA designs, revises, and launches the site in 5–10 business days.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12 md:mb-16">
            <p className="text-gray-700 text-lg md:text-xl max-w-3xl mx-auto">
              Perfect for startups and service-based businesses that want a real website without the tech headache.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 items-start">
            {/* Landing Page Package */}
            <div className="border-2 border-gray-200 rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-8">
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Landing Page</h3>
                <p className="text-gray-500 mb-6">Quick start for new ventures</p>
                <div className="text-4xl md:text-5xl font-bold text-gray-900">$799</div>
                <p className="text-gray-500 mt-2">One-time payment</p>
              </div>
              <div className="p-8">
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start gap-3 text-sm text-gray-600">
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Professional 1-page landing website</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-gray-600">
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Mobile-responsive design</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-gray-600">
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Basic SEO optimization</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-gray-600">
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Contact form integration</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-gray-600">
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Automation setup included</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-gray-600">
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Social media links</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-gray-600">
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Done-for-you content creation</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-gray-600">
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>SSL certificate & security</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-gray-600">
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>1 round of revisions included</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-gray-600">
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Launch in 3-5 business days</span>
                  </li>
                </ul>
                <Button asChild variant="outline" className="w-full py-6 rounded-full border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white font-bold">
                  <Link href="/contact?package=landing">Get Started</Link>
                </Button>
              </div>
            </div>

            {/* Starter Package - Featured */}
            <div className="border-2 border-blue-600 rounded-2xl overflow-hidden shadow-xl md:-mt-4">
              <div className="bg-blue-600 text-white text-center py-2 text-sm font-bold">
                MOST POPULAR
              </div>
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-8 text-white">
                <h3 className="text-2xl md:text-3xl font-bold mb-2">Starter</h3>
                <p className="text-white/90 mb-6">Essential website for small businesses</p>
                <div className="text-4xl md:text-5xl font-bold">$999</div>
                <p className="text-white/90 mt-2">One-time payment</p>
              </div>
              <div className="p-8">
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start gap-3 text-sm text-gray-600">
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Professional 3-page website design</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-gray-600">
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Mobile-responsive layout</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-gray-600">
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Basic SEO optimization</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-gray-600">
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Contact form integration</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-gray-600">
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Social media links</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-gray-600">
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Done-for-you content creation</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-gray-600">
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>SSL certificate & security</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-gray-600">
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>1 round of revisions included</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-gray-600">
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Launch in 5-7 business days</span>
                  </li>
                </ul>
                <Button asChild className="w-full py-6 rounded-full bg-blue-600 hover:bg-blue-700 font-bold">
                  <Link href="/contact?package=starter">Start My Website</Link>
                </Button>
              </div>
            </div>

            {/* Business Package */}
            <div className="border-2 border-gray-200 rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-8">
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Business</h3>
                <p className="text-gray-500 mb-6">Complete website for growing businesses</p>
                <div className="text-4xl md:text-5xl font-bold text-gray-900">$1,199</div>
                <p className="text-gray-500 mt-2">One-time payment</p>
              </div>
              <div className="p-8">
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start gap-3 text-sm text-gray-600">
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Professional 5-page website design</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-gray-600">
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Mobile-responsive layout</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-gray-600">
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Advanced SEO optimization & meta tags</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-gray-600">
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Contact form with email notifications</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-gray-600">
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Social media integration</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-gray-600">
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Google Maps integration</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-gray-600">
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Done-for-you content creation</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-gray-600">
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>SSL certificate & security</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-gray-600">
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Analytics setup (Google Analytics)</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-gray-600">
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>2 rounds of revisions included</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-gray-600">
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Launch in 7-10 business days</span>
                  </li>
                </ul>
                <Button asChild variant="outline" className="w-full py-6 rounded-full border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white font-bold">
                  <Link href="/contact?package=business">Get Started</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4 text-balance">
              Frequently Asked Questions
            </h2>
            <p className="text-gray-500 text-lg">
              Everything you need to know about our website services
            </p>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="text-lg font-semibold text-gray-900 pr-8">{faq.question}</span>
                  <ChevronDown className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${openFaq === index ? "rotate-180 text-blue-600" : ""}`} />
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-6 text-gray-500 leading-relaxed border-t border-gray-100 pt-4">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-gray-900 to-blue-600">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-8 text-balance leading-tight">
            Ready to Look Like a Professional Business Online?
          </h2>
          <p className="text-lg md:text-xl text-white/90 leading-relaxed mb-8">
            Get a trustworthy, conversion-focused website that helps you win more clients and grow your business.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button asChild size="lg" className="rounded-full px-8 py-6 text-base font-bold bg-white text-blue-600 hover:bg-white/90">
              <a href="#pricing">Start My Website Setup</a>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-full px-8 py-6 text-base font-bold border-2 border-white text-white hover:bg-white hover:text-blue-600">
              <Link href="/contact">Book a Strategy Call</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
