import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import App from "./App";
import "./index.css";

// Suppress harmless ResizeObserver errors that can occur during authentication state changes
window.addEventListener('error', (event) => {
  if (event.message?.includes('ResizeObserver loop completed with undelivered notifications')) {
    event.preventDefault();
    return false;
  }
});

// Register service worker for PWA with mobile-specific handling
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    // Add mobile-specific handling
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('SW registered successfully: ', registration);
        
        // Handle mobile-specific registration success
        if (isMobile) {
          console.log('Mobile PWA service worker registered');
          
          // Check for updates more frequently on mobile
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('Mobile PWA update available');
                }
              });
            }
          });
        }
      })
      .catch(registrationError => {
        console.error('SW registration failed: ', registrationError);
        
        // Mobile-specific error handling
        if (isMobile) {
          console.warn('Mobile PWA registration failed - site may not work optimally in mobile browsers');
          
          // Don't block the app, just log the issue
          setTimeout(() => {
            console.log('Mobile fallback: PWA features disabled, continuing with standard web app');
          }, 1000);
        }
      });
  });
}

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
