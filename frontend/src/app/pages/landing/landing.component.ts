import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss'
})
export class LandingComponent {
  features = [
    { icon: '🔍', title: 'Smart Matching', description: 'AI-powered algorithm matches lost items with found reports automatically.' },
    { icon: '🔔', title: 'Real-time Alerts', description: 'Get instant notifications when a potential match is found for your item.' },
    { icon: '🔒', title: 'Secure Claims', description: 'Verification system ensures items are returned to rightful owners.' },
    { icon: '🏫', title: 'Campus-wide', description: 'Connected across all campus buildings, departments, and facilities.' }
  ];

  stats = [
    { value: '500+', label: 'Items Recovered' },
    { value: '2000+', label: 'Active Users' },
    { value: '50+', label: 'Categories' },
    { value: '3', label: 'Campuses' }
  ];

  testimonials = [
    { name: 'Sarah Johnson', role: 'Computer Science Student', text: 'Found my laptop within 24 hours of reporting it lost. The matching system is incredible!' },
    { name: 'Prof. Michael Chen', role: 'Engineering Faculty', text: 'This platform has streamlined how we handle found items in our department. Highly recommended.' },
    { name: 'David Okafor', role: 'Business Student', text: 'Lost my ID card and someone reported finding it the same day. Claimed it hassle-free!' }
  ];
}
