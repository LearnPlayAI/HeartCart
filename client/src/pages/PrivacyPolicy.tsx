import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Shield, Eye, Lock, FileText, Users, Globe, Clock, Mail } from "lucide-react";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-white py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield className="h-8 w-8 text-[#FF69B4]" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-[#FF69B4] to-[#E91E63] bg-clip-text text-transparent">
              Privacy Policy
            </h1>
          </div>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Your privacy is important to us. This policy explains how HeartCart collects, uses, and protects your personal information in compliance with South African law.
          </p>
          <Badge variant="outline" className="mt-4 border-[#FF69B4] text-[#FF69B4]">
            POPIA Compliant • Last Updated: July 3, 2025
          </Badge>
        </div>

        <div className="space-y-6">
          {/* Overview */}
          <Card className="border-l-4 border-l-[#FF69B4] shadow-lg">
            <CardHeader className="bg-gradient-to-r from-[#FF69B4]/10 to-[#E91E63]/10">
              <CardTitle className="flex items-center gap-2 text-[#FF69B4]">
                <Eye className="h-5 w-5" />
                Privacy Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <p className="text-gray-700 leading-relaxed">
                HeartCart (Registration No. 2025/499123/07) respects your privacy and is committed to protecting your personal information in accordance with the Protection of Personal Information Act (POPIA) and other applicable South African privacy laws.
              </p>
              <div className="bg-pink-50 p-4 rounded-lg border-l-4 border-[#FF69B4]">
                <p className="text-gray-700 font-medium">
                  <strong>Data Protection Officer:</strong> HeartCart Privacy Team<br />
                  <strong>Contact:</strong> sales@heartcart.shop<br />
                  <strong>Phone:</strong> +27 71 2063084
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Information We Collect */}
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-[#FF69B4]/10 to-[#E91E63]/10">
              <CardTitle className="flex items-center gap-2 text-[#FF69B4]">
                <FileText className="h-5 w-5" />
                Information We Collect
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900">Personal Information:</h4>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-[#FF69B4] rounded-full mt-2 flex-shrink-0"></div>
                      Full name and contact details
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-[#FF69B4] rounded-full mt-2 flex-shrink-0"></div>
                      Email address and phone number
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-[#FF69B4] rounded-full mt-2 flex-shrink-0"></div>
                      Shipping and billing addresses
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-[#FF69B4] rounded-full mt-2 flex-shrink-0"></div>
                      Payment information (encrypted)
                    </li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900">Usage Information:</h4>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-[#FF69B4] rounded-full mt-2 flex-shrink-0"></div>
                      Browsing history and preferences
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-[#FF69B4] rounded-full mt-2 flex-shrink-0"></div>
                      Device and browser information
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-[#FF69B4] rounded-full mt-2 flex-shrink-0"></div>
                      IP address and location data
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-[#FF69B4] rounded-full mt-2 flex-shrink-0"></div>
                      Cookies and tracking technologies
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* How We Use Your Information */}
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-[#FF69B4]/10 to-[#E91E63]/10">
              <CardTitle className="flex items-center gap-2 text-[#FF69B4]">
                <Users className="h-5 w-5" />
                How We Use Your Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-pink-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Service Delivery</h4>
                  <ul className="space-y-1 text-sm text-gray-700">
                    <li>• Process and fulfill orders</li>
                    <li>• Manage your account</li>
                    <li>• Provide customer support</li>
                    <li>• Send order confirmations</li>
                  </ul>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Communication</h4>
                  <ul className="space-y-1 text-sm text-gray-700">
                    <li>• Marketing and promotions</li>
                    <li>• Important updates</li>
                    <li>• Customer surveys</li>
                    <li>• Technical notifications</li>
                  </ul>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Legal Compliance</h4>
                  <ul className="space-y-1 text-sm text-gray-700">
                    <li>• Fraud prevention</li>
                    <li>• Legal obligations</li>
                    <li>• Security monitoring</li>
                    <li>• Dispute resolution</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Legal Basis for Processing */}
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-[#FF69B4]/10 to-[#E91E63]/10">
              <CardTitle className="flex items-center gap-2 text-[#FF69B4]">
                <FileText className="h-5 w-5" />
                Legal Basis for Processing
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <p className="text-gray-700 leading-relaxed">
                Under POPIA, we process your personal information based on the following lawful grounds:
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Badge className="bg-[#FF69B4] text-white">Contract</Badge>
                    <p className="text-sm text-gray-700">Processing necessary for contract performance (order fulfillment, delivery)</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge className="bg-blue-500 text-white">Consent</Badge>
                    <p className="text-sm text-gray-700">Where you have given explicit consent (marketing communications)</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Badge className="bg-green-500 text-white">Legal</Badge>
                    <p className="text-sm text-gray-700">Compliance with legal obligations (tax records, fraud prevention)</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge className="bg-purple-500 text-white">Interest</Badge>
                    <p className="text-sm text-gray-700">Legitimate business interests (security, analytics, improvements)</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Your Rights */}
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-[#FF69B4]/10 to-[#E91E63]/10">
              <CardTitle className="flex items-center gap-2 text-[#FF69B4]">
                <Shield className="h-5 w-5" />
                Your Privacy Rights
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <p className="text-gray-700 leading-relaxed">
                Under POPIA, you have the following rights regarding your personal information:
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-[#FF69B4]/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <Eye className="h-4 w-4 text-[#FF69B4]" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Right to Access</h4>
                      <p className="text-sm text-gray-700">Request a copy of your personal information we hold</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-[#FF69B4]/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <FileText className="h-4 w-4 text-[#FF69B4]" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Right to Rectification</h4>
                      <p className="text-sm text-gray-700">Correct inaccurate or incomplete information</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-[#FF69B4]/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <Users className="h-4 w-4 text-[#FF69B4]" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Right to Object</h4>
                      <p className="text-sm text-gray-700">Object to processing for marketing purposes</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-[#FF69B4]/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <Lock className="h-4 w-4 text-[#FF69B4]" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Right to Erasure</h4>
                      <p className="text-sm text-gray-700">Request deletion of your personal information</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-[#FF69B4]/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <Globe className="h-4 w-4 text-[#FF69B4]" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Right to Portability</h4>
                      <p className="text-sm text-gray-700">Receive your data in a portable format</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-[#FF69B4]/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <Clock className="h-4 w-4 text-[#FF69B4]" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Right to Restriction</h4>
                      <p className="text-sm text-gray-700">Limit how we process your information</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Security */}
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-[#FF69B4]/10 to-[#E91E63]/10">
              <CardTitle className="flex items-center gap-2 text-[#FF69B4]">
                <Lock className="h-5 w-5" />
                Data Security & Retention
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Security Measures</h4>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-[#FF69B4] rounded-full mt-2 flex-shrink-0"></div>
                      SSL/TLS encryption for data transmission
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-[#FF69B4] rounded-full mt-2 flex-shrink-0"></div>
                      Secure payment processing via encrypted gateways
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-[#FF69B4] rounded-full mt-2 flex-shrink-0"></div>
                      Regular security audits and monitoring
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-[#FF69B4] rounded-full mt-2 flex-shrink-0"></div>
                      Access controls and staff training
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Retention Periods</h4>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-[#FF69B4] rounded-full mt-2 flex-shrink-0"></div>
                      Account information: Duration of account + 3 years
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-[#FF69B4] rounded-full mt-2 flex-shrink-0"></div>
                      Transaction records: 5 years (tax compliance)
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-[#FF69B4] rounded-full mt-2 flex-shrink-0"></div>
                      Marketing data: Until consent withdrawn
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-[#FF69B4] rounded-full mt-2 flex-shrink-0"></div>
                      Website analytics: 24 months maximum
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sharing and Third Parties */}
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-[#FF69B4]/10 to-[#E91E63]/10">
              <CardTitle className="flex items-center gap-2 text-[#FF69B4]">
                <Globe className="h-5 w-5" />
                Information Sharing
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <p className="text-gray-700 leading-relaxed">
                We only share your personal information with trusted third parties under strict conditions:
              </p>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Service Providers</h4>
                  <ul className="space-y-1 text-sm text-gray-700">
                    <li>• Payment processors</li>
                    <li>• Shipping companies</li>
                    <li>• Email service providers</li>
                    <li>• Cloud hosting services</li>
                  </ul>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Legal Requirements</h4>
                  <ul className="space-y-1 text-sm text-gray-700">
                    <li>• Court orders</li>
                    <li>• Regulatory compliance</li>
                    <li>• Fraud investigation</li>
                    <li>• Tax authorities</li>
                  </ul>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Business Partners</h4>
                  <ul className="space-y-1 text-sm text-gray-700">
                    <li>• Sales representatives</li>
                    <li>• Marketing partners</li>
                    <li>• Analytics providers</li>
                    <li>• Customer support tools</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cookies and Tracking */}
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-[#FF69B4]/10 to-[#E91E63]/10">
              <CardTitle className="flex items-center gap-2 text-[#FF69B4]">
                <Eye className="h-5 w-5" />
                Cookies & Tracking
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <p className="text-gray-700 leading-relaxed">
                We use cookies and similar technologies to enhance your experience:
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Badge className="bg-green-500 text-white">Essential</Badge>
                    <p className="text-sm text-gray-700">Required for website functionality (login, cart, security)</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge className="bg-blue-500 text-white">Analytics</Badge>
                    <p className="text-sm text-gray-700">Help us understand how visitors use our website</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Badge className="bg-[#FF69B4] text-white">Marketing</Badge>
                    <p className="text-sm text-gray-700">Track marketing campaigns and personalize content</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge className="bg-purple-500 text-white">Preferences</Badge>
                    <p className="text-sm text-gray-700">Remember your settings and preferences</p>
                  </div>
                </div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-400">
                <p className="text-gray-700 text-sm">
                  <strong>Cookie Control:</strong> You can manage cookie preferences in your browser settings. Note that disabling certain cookies may affect website functionality.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Contact and Complaints */}
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-[#FF69B4]/10 to-[#E91E63]/10">
              <CardTitle className="flex items-center gap-2 text-[#FF69B4]">
                <Mail className="h-5 w-5" />
                Contact & Complaints
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Contact Our Privacy Team</h4>
                  <div className="space-y-2 text-gray-700">
                    <p><strong>Email:</strong> sales@heartcart.shop</p>
                    <p><strong>Phone:</strong> +27712063084</p>
                    <p><strong>Address:</strong><br />
                    HeartCart Privacy Department<br />
                    Johannesburg, South Africa</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Lodge a Complaint</h4>
                  <div className="space-y-2 text-gray-700">
                    <p>If you're not satisfied with our response, you can contact:</p>
                    <p><strong>Information Regulator South Africa</strong><br />
                    <strong>Website:</strong> inforegulator.org.za<br />
                    <strong>Email:</strong> complaints.IR@justice.gov.za<br />
                    <strong>Phone:</strong> +27712063084</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Updates */}
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-[#FF69B4]/10 to-[#E91E63]/10">
              <CardTitle className="flex items-center gap-2 text-[#FF69B4]">
                <Clock className="h-5 w-5" />
                Policy Updates
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <p className="text-gray-700 leading-relaxed">
                We may update this Privacy Policy periodically to reflect changes in our practices, technology, legal requirements, or other factors. We will notify you of any material changes by:
              </p>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-[#FF69B4] rounded-full mt-2 flex-shrink-0"></div>
                  Posting a notice on our website
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-[#FF69B4] rounded-full mt-2 flex-shrink-0"></div>
                  Sending an email notification to registered users
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-[#FF69B4] rounded-full mt-2 flex-shrink-0"></div>
                  Updating the "Last Updated" date at the top of this policy
                </li>
              </ul>
              <div className="bg-[#FF69B4]/10 p-4 rounded-lg">
                <p className="text-gray-700 font-medium">
                  By continuing to use our services after policy updates, you acknowledge and agree to the revised terms.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator className="my-8" />

        {/* Footer */}
        <div className="text-center space-y-4">
          <p className="text-gray-600">
            This Privacy Policy is effective as of July 3, 2025, and complies with the Protection of Personal Information Act (POPIA) and other applicable South African privacy laws.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Shield className="h-4 w-4 text-[#FF69B4]" />
            <span>Your privacy is protected by South African law</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;