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
import ContextualInstallPrompts from '@/components/pwa/ContextualInstallPrompts';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-50 border-t">
      <div className="container mx-auto px-4 py-12">
        {/* PWA Install Section */}
        <div className="mb-12">
          <ContextualInstallPrompts 
            context="general" 
            className="max-w-4xl mx-auto"
          />
        </div>

        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Logo />
            </div>
            <p className="text-gray-600 text-sm">
              Your trusted South African e-commerce platform. Shop with confidence and get your products delivered fast with our innovative PUDO locker system.
            </p>
            
            {/* Mobile App Download */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Get Our Mobile App
              </h4>
              <div className="space-y-2">
                <MobileInstallButton 
                  variant="default"
                  size="sm"
                  className="w-full justify-start"
                  showAlways={true}
                />
                <p className="text-xs text-gray-500">
                  Fast, offline-capable shopping experience right on your phone
                </p>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="text-gray-600 hover:text-[#FF69B4] transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/products" className="text-gray-600 hover:text-[#FF69B4] transition-colors">
                  All Products
                </Link>
              </li>
              <li>
                <Link href="/my-orders" className="text-gray-600 hover:text-[#FF69B4] transition-colors">
                  My Orders
                </Link>
              </li>
              <li>
                <Link href="/my-favourites" className="text-gray-600 hover:text-[#FF69B4] transition-colors">
                  My Favourites
                </Link>
              </li>
              <li>
                <Link href="/credit-history" className="text-gray-600 hover:text-[#FF69B4] transition-colors">
                  Credit History
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Service */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">Customer Service</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2 text-gray-600">
                <Phone className="h-4 w-4" />
                <span>+27 71 206 3084</span>
              </li>
              <li className="flex items-center gap-2 text-gray-600">
                <Mail className="h-4 w-4" />
                <span>sales@teemeyou.co.za</span>
              </li>
              <li className="flex items-center gap-2 text-gray-600">
                <MapPin className="h-4 w-4" />
                <span>Johannesburg, South Africa</span>
              </li>
            </ul>
            
            {/* App Benefits */}
            <div className="space-y-2 pt-2">
              <h5 className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                App Benefits
              </h5>
              <ul className="space-y-1 text-xs text-gray-600">
                <li className="flex items-center gap-1">
                  <Zap className="h-3 w-3 text-yellow-500" />
                  Faster checkout
                </li>
                <li className="flex items-center gap-1">
                  <Shield className="h-3 w-3 text-green-500" />
                  Offline browsing
                </li>
                <li className="flex items-center gap-1">
                  <Truck className="h-3 w-3 text-blue-500" />
                  Push notifications for orders
                </li>
              </ul>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">Contact Us</h4>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-[#FF69B4]" />
                <span>sales@teemeyou.shop</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-[#FF69B4]" />
                <span>+27 (0) 11 123 4567</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#FF69B4]" />
                <span>Johannesburg, South Africa</span>
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        {/* Bottom Footer */}
        <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
          <div className="text-sm text-gray-600">
            © {currentYear} TeeMeYou. All rights reserved.
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <a href="#" className="text-gray-600 hover:text-[#FF69B4] transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="text-gray-600 hover:text-[#FF69B4] transition-colors">
              Terms of Service
            </a>
            <a href="#" className="text-gray-600 hover:text-[#FF69B4] transition-colors">
              Shipping Info
            </a>
            <a href="#" className="text-gray-600 hover:text-[#FF69B4] transition-colors">
              Returns
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;