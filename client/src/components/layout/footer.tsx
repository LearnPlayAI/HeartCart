import React from 'react';
import { Link } from 'wouter';
import { 
  Download, 
  Smartphone, 
  Mail, 
  Phone, 
  MapPin, 
  Zap,
  Shield,
  Truck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import Logo from '@/components/ui/logo';
import InstallButton from '@/components/pwa/InstallButton';
import MobileInstallButton from '@/components/pwa/MobileInstallButton';
import MobileAppInstallButton from '@/components/pwa/MobileAppInstallButton';
import ContextualInstallPrompts from '@/components/pwa/ContextualInstallPrompts';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-b from-gray-50 to-gray-100 border-t border-gray-200">
      <div className="container mx-auto px-4 py-16">
        {/* PWA Install Section */}
        <div className="mb-16">
          <ContextualInstallPrompts 
            context="general" 
            className="max-w-4xl mx-auto"
          />
        </div>

        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 mb-12">
          
          {/* Company Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center space-x-3">
              <Logo />
            </div>
            <p className="text-gray-600 text-sm leading-relaxed max-w-md">
              Your trusted South African e-commerce platform. Shop with confidence and get your products delivered fast with our innovative PUDO locker system.
            </p>
            
            {/* Mobile App Download */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 max-w-sm">
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-[#FF69B4] to-[#E91E63] rounded-lg flex items-center justify-center">
                    <Smartphone className="h-4 w-4 text-white" />
                  </div>
                  Get Our Mobile App
                </h4>
                <div className="space-y-3">
                  <MobileInstallButton 
                    variant="default"
                    size="sm"
                    className="w-full justify-center bg-gradient-to-r from-[#FF69B4] to-[#E91E63] hover:from-[#E91E63] hover:to-[#FF69B4] text-white border-0"
                    showAlways={true}
                  />
                  <p className="text-xs text-gray-500 text-center">
                    Fast, offline-capable shopping experience
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-6">
            <h4 className="font-semibold text-gray-900 text-lg">Quick Links</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/" className="text-gray-600 hover:text-[#FF69B4] transition-colors text-sm flex items-center gap-2 group">
                  <div className="w-1 h-1 bg-[#FF69B4] rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  Home
                </Link>
              </li>
              <li>
                <Link href="/products" className="text-gray-600 hover:text-[#FF69B4] transition-colors text-sm flex items-center gap-2 group">
                  <div className="w-1 h-1 bg-[#FF69B4] rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  All Products
                </Link>
              </li>
              <li>
                <Link href="/my-orders" className="text-gray-600 hover:text-[#FF69B4] transition-colors text-sm flex items-center gap-2 group">
                  <div className="w-1 h-1 bg-[#FF69B4] rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  My Orders
                </Link>
              </li>
              <li>
                <Link href="/my-favourites" className="text-gray-600 hover:text-[#FF69B4] transition-colors text-sm flex items-center gap-2 group">
                  <div className="w-1 h-1 bg-[#FF69B4] rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  My Favourites
                </Link>
              </li>
              <li>
                <Link href="/credit-history" className="text-gray-600 hover:text-[#FF69B4] transition-colors text-sm flex items-center gap-2 group">
                  <div className="w-1 h-1 bg-[#FF69B4] rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  Credit History
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Us */}
          <div className="space-y-6">
            <h4 className="font-semibold text-gray-900 text-lg">Contact Us</h4>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-[#FF69B4] to-[#E91E63] rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Email</p>
                  <p className="text-sm text-gray-700 font-medium">sales@teemeyou.shop</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-[#FF69B4] to-[#E91E63] rounded-lg flex items-center justify-center flex-shrink-0">
                  <Phone className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Phone</p>
                  <p className="text-sm text-gray-700 font-medium">+27 71 206 3084</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-[#FF69B4] to-[#E91E63] rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Location</p>
                  <p className="text-sm text-gray-700 font-medium">Johannesburg, South Africa</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-8 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />

        {/* Bottom Footer */}
        <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0 pt-4">
          <div className="text-sm text-gray-600 font-medium">
            © {currentYear} TeeMeYou. All rights reserved.
          </div>
          <div className="flex flex-wrap gap-6 text-sm">
            <Link href="/privacy-policy" className="text-gray-600 hover:text-[#FF69B4] transition-colors font-medium relative group">
              Privacy Policy
              <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-[#FF69B4] to-[#E91E63] group-hover:w-full transition-all duration-300"></div>
            </Link>
            <Link href="/terms-and-conditions" className="text-gray-600 hover:text-[#FF69B4] transition-colors font-medium relative group">
              Terms and Conditions
              <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-[#FF69B4] to-[#E91E63] group-hover:w-full transition-all duration-300"></div>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;