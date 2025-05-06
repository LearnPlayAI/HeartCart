import React from 'react';
import { Link } from 'wouter';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Layers, Facebook, Instagram, Twitter, Linkedin } from 'lucide-react';
import Logo from '@/components/ui/logo';

const Footer = () => {
  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Newsletter subscription logic would go here
  };
  
  return (
    <footer className="bg-gray-100 pt-8 pb-4">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <div>
            <h3 className="font-bold text-gray-800 mb-3">Shop</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="text-gray-600 hover:text-[#FF69B4]">All Categories</Link></li>
              <li><Link href="/" className="text-gray-600 hover:text-[#FF69B4]">Flash Deals</Link></li>
              <li><Link href="/" className="text-gray-600 hover:text-[#FF69B4]">Best Sellers</Link></li>
              <li><Link href="/" className="text-gray-600 hover:text-[#FF69B4]">New Arrivals</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-bold text-gray-800 mb-3">Customer Service</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="text-gray-600 hover:text-[#FF69B4]">Contact Us</Link></li>
              <li><Link href="/" className="text-gray-600 hover:text-[#FF69B4]">FAQs</Link></li>
              <li><Link href="/" className="text-gray-600 hover:text-[#FF69B4]">Shipping Policy</Link></li>
              <li><Link href="/" className="text-gray-600 hover:text-[#FF69B4]">Returns & Refunds</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-bold text-gray-800 mb-3">About Us</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="text-gray-600 hover:text-[#FF69B4]">Our Story</Link></li>
              <li><Link href="/" className="text-gray-600 hover:text-[#FF69B4]">Local Suppliers</Link></li>
              <li><Link href="/" className="text-gray-600 hover:text-[#FF69B4]">Careers</Link></li>
              <li><Link href="/" className="text-gray-600 hover:text-[#FF69B4]">Press</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-bold text-gray-800 mb-3">Follow Us</h3>
            <div className="flex space-x-3 mb-4">
              <a href="#" className="text-gray-600 hover:text-[#FF69B4] text-lg">
                <Facebook />
              </a>
              <a href="#" className="text-gray-600 hover:text-[#FF69B4] text-lg">
                <Instagram />
              </a>
              <a href="#" className="text-gray-600 hover:text-[#FF69B4] text-lg">
                <Twitter />
              </a>
              <a href="#" className="text-gray-600 hover:text-[#FF69B4] text-lg">
                <Linkedin />
              </a>
            </div>
            
            <h3 className="font-bold text-gray-800 mb-2">Newsletter</h3>
            <form onSubmit={handleNewsletterSubmit} className="flex">
              <Input
                type="email"
                placeholder="Your email"
                className="text-sm rounded-l-lg px-3 py-2 flex-1 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#FF69B4]"
              />
              <Button type="submit" className="bg-[#FF69B4] text-white px-3 py-2 rounded-r-lg text-sm">
                <Layers size={16} />
              </Button>
            </form>
          </div>
        </div>
        
        <div className="border-t border-gray-200 pt-6 flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <Logo className="h-10 w-auto" />
          </div>
          <div className="text-center md:text-right">
            <div className="mb-2 text-sm text-gray-600">
              &copy; {new Date().getFullYear()} TEE ME YOU. All rights reserved.
            </div>
            <div className="flex justify-center md:justify-end space-x-4 text-xs text-gray-500">
              <Link href="/" className="hover:text-[#FF69B4]">Privacy Policy</Link>
              <Link href="/" className="hover:text-[#FF69B4]">Terms of Service</Link>
              <Link href="/" className="hover:text-[#FF69B4]">Cookies Settings</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
