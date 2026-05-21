import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import FAQSection from '../components/FAQSection';
import { 
  TargetIcon, 
  ChartBarIcon, 
  AcademicCapIcon, 
  UsersIcon, 
  CheckIcon, 
  OfficeIcon, 
  ChatIcon,
  RocketIcon,
  BookIcon,
  DocumentIcon,
  MicrophoneIcon,
  StarIcon,
  PhoneIcon,
  MailIcon,
  TwitterIcon,
  LinkedInIcon,
  LightBulbIcon
} from '../components/ui/Icons';

const StudentHomePage: React.FC = () => {
  const { isAuthenticated, user, loading } = useAuth();
  const router = useRouter();
  const [currentFeature, setCurrentFeature] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  React.useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push('/dashboard').catch(console.error);
    }
  }, [isAuthenticated, loading, router]);

  // Animate sections on load
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Auto-rotate featured testimonials/features
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature(prev => (prev + 1) % 3);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-accent-50 to-neutral-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-accent-600 border-t-transparent mx-auto"></div>
          <p className="mt-6 text-neutral-600 font-medium text-lg">Loading TalentLens...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null; // Will redirect to dashboard
  }

  const features = [
    {
      icon: <TargetIcon className="w-8 h-8" />,
      title: "AI-Powered Interview Practice",
      description: "Practice with industry-specific questions powered by advanced AI technology.",
      stats: "95% success rate"
    },
    {
      icon: <ChartBarIcon className="w-8 h-8" />,
      title: "Real-time Performance Analytics",
      description: "Track your progress with detailed analytics and personalized recommendations.",
      stats: "50+ metrics tracked"
    },
    {
      icon: <AcademicCapIcon className="w-8 h-8" />,
      title: "Expert-Designed Curriculum",
      description: "Learn from industry professionals with structured learning paths.",
      stats: "500+ companies trust us"
    }
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Computer Science Student",
      quote: "TalentLens helped me land my dream internship at Google. The interview practice was incredibly realistic!",
      avatar: "SJ"
    },
    {
      name: "Michael Chen",
      role: "Business Major",
      quote: "The feedback system is amazing. I improved my interview confidence by 200% in just two weeks.",
      avatar: "MC"
    },
    {
      name: "Emily Rodriguez",
      role: "Engineering Student",
      quote: "The resume analysis feature caught mistakes I never would have noticed. Highly recommended!",
      avatar: "ER"
    }
  ];

  const stats = [
    { label: "Students Trained", value: "10,000+", icon: <UsersIcon className="w-8 h-8" /> },
    { label: "Success Rate", value: "94%", icon: <CheckIcon className="w-8 h-8" /> },
    { label: "Partner Companies", value: "500+", icon: <OfficeIcon className="w-8 h-8" /> },
    { label: "Interview Sessions", value: "50,000+", icon: <ChatIcon className="w-8 h-8" /> }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-accent-50 to-neutral-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-soft sticky top-0 z-50 border-b border-neutral-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-accent-600 to-accent-700 rounded-xl flex items-center justify-center shadow-medium">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-neutral-900">TalentLens</h1>
                <p className="text-sm text-neutral-500">Student Portal</p>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <Link href="/signin">
                <Button variant="outline" size="md" className="hover:shadow-medium">
                  Sign In
                </Button>
              </Link>
              <div className="hidden sm:flex items-center px-4 py-3 text-sm text-neutral-600 bg-neutral-100 rounded-xl border border-neutral-200">
                <LightBulbIcon className="w-4 h-4 mr-2 text-warning-600" />
                Contact your teacher for account creation
              </div>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-6">
              <RocketIcon className="w-4 h-4 mr-2" />
              Join thousands of successful students
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              Master Your
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"> Interview Skills</span>
            </h1>
            <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
              Practice interviews with AI, get expert feedback on your resume, and track your progress with detailed analytics. 
              Transform your career potential with our comprehensive interview training platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link href="/signin">
                <Button size="lg" className="px-8 py-4 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 flex items-center">
                  <TargetIcon className="w-5 h-5 mr-2" />
                  Start Learning Now
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="px-8 py-4 text-lg flex items-center">
                <Link href="/demo" className="flex items-center">
                  <BookIcon className="w-5 h-5 mr-2" />
                  View Demo
                </Link>
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="flex justify-center mb-2 text-blue-600">{stat.icon}</div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
                  <div className="text-gray-600 text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="bg-white py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Choose TalentLens?</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Our platform combines cutting-edge AI technology with proven educational methods
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
              {/* Feature showcase */}
              <div className="space-y-8">
                {features.map((feature, index) => (
                  <div 
                    key={index}
                    className={`p-6 rounded-xl border-2 transition-all duration-500 cursor-pointer ${
                      currentFeature === index 
                        ? 'border-blue-500 bg-blue-50 shadow-lg' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setCurrentFeature(index)}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="text-blue-600">{feature.icon}</div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                        <p className="text-gray-600 mb-2">{feature.description}</p>
                        <div className="text-sm font-medium text-blue-600">{feature.stats}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Visual mockup */}
              <div className="relative">
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 shadow-2xl">
                  <div className="bg-gray-800 rounded-lg p-6 mb-4">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    </div>
                    <div className="space-y-3">
                      <div className="h-4 bg-gray-600 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-600 rounded w-1/2"></div>
                      <div className="h-6 bg-blue-500 rounded w-32"></div>
                    </div>
                  </div>
                  <div className="text-center text-white">
                    <div className="flex justify-center mb-2">
                      <MicrophoneIcon className="w-8 h-8" />
                    </div>
                    <p className="text-sm text-gray-300">AI Interview in Progress</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Core Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="hover:shadow-lg transition-shadow duration-300 border-0 shadow-md">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <TargetIcon className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-xl">Mock Interviews</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base text-gray-600 leading-relaxed">
                    Practice with AI-powered interviews featuring industry-specific questions, real-time feedback, and voice analysis.
                  </CardDescription>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">Real-time feedback</span>
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs">Voice analysis</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow duration-300 border-0 shadow-md">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <DocumentIcon className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-xl">Resume Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base text-gray-600 leading-relaxed">
                    Get comprehensive feedback on your resume with suggestions for improvement and industry best practices.
                  </CardDescription>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs">ATS optimization</span>
                    <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">Expert tips</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow duration-300 border-0 shadow-md">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <ChartBarIcon className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-xl">Progress Tracking</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base text-gray-600 leading-relaxed">
                    Monitor your improvement with detailed analytics, performance metrics, and personalized learning paths.
                  </CardDescription>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">Analytics</span>
                    <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">Insights</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="bg-gradient-to-br from-gray-50 to-gray-100 py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">What Students Say</h2>
              <p className="text-xl text-gray-600">Real success stories from our community</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <CardContent className="p-8">
                    <div className="flex items-center space-x-4 mb-6">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold">
                        {testimonial.avatar}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{testimonial.name}</div>
                        <div className="text-gray-600 text-sm">{testimonial.role}</div>
                      </div>
                    </div>
                    <blockquote className="text-gray-700 italic leading-relaxed">
                      &quot;{testimonial.quote}&quot;
                    </blockquote>
                    <div className="mt-4 flex text-yellow-400">
                      {[...Array(5)].map((_, i) => (
                        <StarIcon key={i} className="w-4 h-4" />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="bg-gradient-to-r from-blue-600 to-indigo-600 py-20">
          <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
            <h2 className="text-4xl font-bold text-white mb-6">Ready to Start Your Journey?</h2>
            <p className="text-xl text-blue-100 mb-10 leading-relaxed">
              Join thousands of students who have transformed their career prospects with TalentLens. 
              Your teacher will provide you with login credentials to get started.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signin">
                <Button size="lg" className="px-8 py-4 text-lg bg-white text-blue-600 hover:bg-gray-50 flex items-center">
                  <RocketIcon className="w-5 h-5 mr-2" />
                  Get Started Now
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="px-8 py-4 text-lg border-white text-white hover:bg-white hover:text-blue-600 flex items-center">
                <PhoneIcon className="w-5 h-5 mr-2" />
                Contact Support
              </Button>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <FAQSection 
          faqs={[
            {
              question: "How do I get access to TalentLens?",
              answer: "Your teacher or instructor will create an account for you and provide login credentials. TalentLens is designed to be used as part of educational curricula, so individual sign-ups are not available."
            },
            {
              question: "What types of interviews can I practice?",
              answer: "TalentLens offers practice sessions for technical interviews, behavioral interviews, case studies, and industry-specific scenarios. Our AI adapts questions based on your field of study and experience level."
            },
            {
              question: "How does the AI feedback work?",
              answer: "Our AI analyzes your responses for content quality, communication skills, confidence level, and technical accuracy. You'll receive detailed feedback on areas like structure, clarity, specific examples, and suggestions for improvement."
            },
            {
              question: "Can I track my progress over time?",
              answer: "Yes! TalentLens provides comprehensive analytics showing your improvement trends, strong areas, areas for development, and personalized recommendations based on your performance history."
            },
            {
              question: "Is my practice data secure and private?",
              answer: "Absolutely. We use enterprise-grade security measures to protect your data. Your practice sessions, responses, and progress information are encrypted and only accessible to you and your authorized instructors."
            },
            {
              question: "What if I need technical support?",
              answer: "We provide comprehensive support through multiple channels including email, live chat, and help documentation. Your teacher can also assist with account-related questions."
            },
            {
              question: "Can I use TalentLens on mobile devices?",
              answer: "Yes! TalentLens is fully responsive and works on desktop computers, tablets, and smartphones. However, for the best interview practice experience, we recommend using a desktop or laptop with a good camera and microphone."
            },
            {
              question: "How often should I practice to see improvement?",
              answer: "We recommend practicing 2-3 times per week for optimal results. Consistent practice with reflection on feedback tends to show the most significant improvement in interview skills."
            }
          ]}
        />
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">TL</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold">TalentLens</h3>
                  <p className="text-gray-400 text-sm">Student Portal</p>
                </div>
              </div>
              <p className="text-gray-400 mb-6 max-w-md">
                Empowering students with AI-powered interview practice and career development tools.
              </p>
              <div className="flex space-x-4">
                <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 cursor-pointer">
                  <MailIcon className="w-5 h-5 text-gray-400" />
                </div>
                <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 cursor-pointer">
                  <TwitterIcon className="w-5 h-5 text-gray-400" />
                </div>
                <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 cursor-pointer">
                  <LinkedInIcon className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Support</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Help</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Getting Started</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2025 TalentLens. All rights reserved. Built for student success.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default StudentHomePage;
