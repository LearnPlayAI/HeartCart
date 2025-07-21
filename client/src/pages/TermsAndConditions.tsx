import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Shield, Truck, RefreshCw, Mail, Phone, MapPin } from 'lucide-react';

const TermsAndConditions = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Terms and Conditions
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            These Terms and Conditions are binding to all registered customers who buy on this platform.
          </p>
          <Badge variant="outline" className="mt-4 text-red-600 border-red-300">
            <AlertCircle className="h-4 w-4 mr-1" />
            Important: Legally Binding Agreement
          </Badge>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Introduction */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Shield className="h-5 w-5 text-[#FF69B4]" />
                1. Introduction
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700 leading-relaxed">
                <strong>https://heartcart.shop</strong> is an online retail store providing great products at discounted pricing. 
                These Terms and Conditions govern your use of our website and services. By accessing or using our services, 
                you agree to be bound by these Terms and comply with the South African Consumer Protection Act, 2008.
              </p>
            </CardContent>
          </Card>

          {/* Product Availability */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-[#FF69B4]" />
                2. Product Availability
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700 leading-relaxed">
                HeartCart will make all reasonable efforts to notify you when a product is no longer available once ordered. 
                In these cases, HeartCart will provide you with:
              </p>
              <ul className="space-y-2 ml-4">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-1" />
                  <span className="text-gray-700">Alternative product options</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-1" />
                  <span className="text-gray-700">An estimated time of arrival on new stock arriving (goes on back order)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-1" />
                  <span className="text-gray-700">A credit on your store credit account</span>
                </li>
              </ul>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-blue-800 font-medium">Important Note:</p>
                <p className="text-blue-700 mt-1">
                  Some items ordered may not be available in the colour or product attribute option selected. 
                  Please mention your second option in the customer notes on the checkout page. If an alternative 
                  colour or attribute is not available, the value of the item purchased will be given back as store credit.
                </p>
              </div>
              <p className="text-gray-600 italic">
                Don't get discouraged if a product you order is suddenly not available. There's a constant flow of 
                inventory referring to popular and new stock. Your product might be available again in 3 to 6 weeks.
              </p>
            </CardContent>
          </Card>

          {/* Prices and Discounts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Badge className="h-5 w-5 bg-[#FF69B4]">%</Badge>
                3. Prices and Discounts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <p className="text-yellow-800 font-medium">Price Changes</p>
                  <p className="text-yellow-700 mt-1">
                    All product prices as advertised on our website or as promoted in any customized promotional material 
                    are subject to change without prior notice.
                  </p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <p className="text-orange-800 font-medium">Promotional Offers</p>
                  <p className="text-orange-700 mt-1">
                    All promotions and % discount offers are offered at the discretion of HeartCart and may be 
                    revoked or changed at any time.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Processing */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-[#FF69B4]" />
                4. Order Processing and Cancellation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <p className="text-red-800 font-medium">Important Cancellation Policy:</p>
                <ul className="text-red-700 mt-2 space-y-1">
                  <li className="flex items-start gap-2">
                    <span className="font-medium">4.1.</span>
                    <span>Due to our quick processing time, we are not able to cancel the order once payment has been made.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-medium">4.2.</span>
                    <span>Please review your order carefully before finalizing your purchase.</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Quality Checking */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-[#FF69B4]" />
                5. Quality Checking of Electronic Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">
                Quality checks are performed on all electronic products before they are shipped to customers. 
                This is a basic quality check to ensure that the product turns on, charges, functions properly, 
                and shows no noticeable damage.
              </p>
            </CardContent>
          </Card>

          {/* Damages and Returns */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Shield className="h-5 w-5 text-[#FF69B4]" />
                6. Damages and Returns
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-green-800 font-medium">Our General Warranty:</p>
                <ul className="text-green-700 mt-2 space-y-1">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-1" />
                    <span><strong>Products under R500:</strong> 5-day warranty from date of delivery (to your PUDO locker)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-1" />
                    <span><strong>Products R500 or more:</strong> 15-day warranty from date of delivery (to your PUDO locker)</span>
                  </li>
                </ul>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-blue-800 font-medium">Upon receiving your order:</p>
                <ol className="text-blue-700 mt-2 space-y-1 list-decimal ml-4">
                  <li>Please make sure you received what you ordered and check that everything is working as it should</li>
                  <li>If a product supplied is the wrong product or if the product is received damaged, contact us at <strong>sales@heartcart.shop</strong></li>
                  <li>For any returns, please email the details of the product, including pictures where applicable, and reference your order number as found on the My Orders page</li>
                </ol>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-gray-800 font-medium">Return Requirements:</p>
                <p className="text-gray-700 mt-1">
                  All products returned to HeartCart must be returned unused, with all relevant parts, 
                  and in the original packaging. After we receive the returned product, we will inspect it 
                  and determine the next steps.
                </p>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <p className="text-yellow-800 font-medium">Important Disclaimer:</p>
                <p className="text-yellow-700 mt-1">
                  Damaged product in this document refers to manufacturing faults only. Damages resulting 
                  from accidental or customer negligence do not apply. HeartCart is a third-party reseller 
                  of goods and cannot be directly held accountable for any injuries or damages a product may 
                  cause due to product malfunctions or misuse by the customer.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Shipping */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Truck className="h-5 w-5 text-[#FF69B4]" />
                7. Pick-up and Shipping Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700 leading-relaxed">
                HeartCart offers PUDO locker delivery throughout South Africa. Please select the correct 
                shipping option and use the View on Google Maps link to ensure you have chosen the nearest 
                PUDO locker to your location at checkout.
              </p>
              <p className="text-gray-700 leading-relaxed">
                Once you have chosen a PUDO locker and made payment for the order, the location of this 
                PUDO locker cannot be changed without incurring additional costs for the customer.
              </p>

              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <p className="text-orange-800 font-medium">Important Shipping Notes:</p>
                <ul className="text-orange-700 mt-2 space-y-1">
                  <li className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-500 mt-1" />
                    <span>It is the customer's responsibility to choose the correct PUDO locker.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-500 mt-1" />
                    <span>The customer is responsible for collecting the order from their chosen PUDO locker within 4 days of delivery.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-1" />
                    <span>The Customer will be emailed with the PUDO locker details and tracking information.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-1" />
                    <span>The PUDO tracking information can also be accessed via the My Orders Page on the website.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-1" />
                    <span>Items will normally be delivered within 5-10 working days after payment is received unless otherwise stated</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Color and Size Disclaimer */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-[#FF69B4]" />
                8. Colour and Size Disclaimer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700 leading-relaxed">
                The details of products, descriptions, or specifications (for example, weight, colour, size, etc.) 
                are only approximate values. There may be slight variations in product design and pattern as 
                compared to the images shown on our website.
              </p>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <p className="text-purple-800 font-medium">Colour Disclaimer:</p>
                  <p className="text-purple-700 mt-1">
                    Due to variations in monitor settings and display output of digital photography, we assume 
                    no responsibility and make no guarantees regarding colour matches of products. We cannot 
                    guarantee that the colours displayed on our website will exactly match the colour of the product.
                  </p>
                </div>
                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                  <p className="text-indigo-800 font-medium">Size Disclaimer:</p>
                  <p className="text-indigo-700 mt-1">
                    We make every effort to provide accurate information regarding product sizing and dimensions. 
                    However, due to the nature of the manufacturing process, product sizing may vary slightly 
                    from time to time. Please always allow for 3-5 cm difference.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Legal Terms */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Shield className="h-5 w-5 text-[#FF69B4]" />
                9. Legal Terms
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <ul className="text-gray-700 space-y-2">
                  <li>• We reserve the right to refuse orders, cancel any sale, and terminate accounts at our discretion.</li>
                  <li>• This website is governed by the laws of South Africa, and HeartCart chooses as its domicilium citandi et executandi for all purposes under this agreement, whether in respect of court process, notice, or other documents or communication of whatsoever nature.</li>
                  <li>• HeartCart may, in its sole discretion, change this agreement or any part thereof at any time without notice.</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Mail className="h-5 w-5 text-[#FF69B4]" />
                10. Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed mb-4">
                For questions about these Terms & Conditions or any issues:
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-[#FF69B4]" />
                  <span className="text-gray-700">Email: <strong>sales@heartcart.shop</strong></span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-[#FF69B4]" />
                  <span className="text-gray-700">Website: <strong>https://heartcart.shop</strong></span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <Separator className="my-8" />
          <p className="text-gray-500 text-sm">
            Last updated: {new Date().toLocaleDateString('en-ZA')}
          </p>
          <p className="text-gray-500 text-sm mt-2">
            These terms and conditions are governed by South African law.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditions;