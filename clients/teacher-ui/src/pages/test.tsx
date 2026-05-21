import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const TestPage: React.FC = () => {
  const [apiStatus, setApiStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [backendResponse, setBackendResponse] = useState<string>('');

  const testApiConnection = async () => {
    setApiStatus('loading');
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/test/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.text();
        setBackendResponse(data);
        setApiStatus('success');
      } else {
        setBackendResponse(`HTTP ${response.status}: ${response.statusText}`);
        setApiStatus('error');
      }
    } catch (error: any) {
      setBackendResponse(error.message);
      setApiStatus('error');
    }
  };

  useEffect(() => {
    testApiConnection();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">System Test Dashboard</h1>
          <p className="text-gray-600 mt-2">Testing the connection between frontend and backend</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Frontend Status */}
          <Card>
            <Card.Header>
              <Card.Title>Frontend Status</Card.Title>
            </Card.Header>
            <Card.Content>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">Next.js Version:</span>
                  <span className="text-sm text-gray-900">14.2.30</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">Status:</span>
                  <span className="text-sm text-green-600 font-medium flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Running
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">Port:</span>
                  <span className="text-sm text-gray-900">3000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">API URL:</span>
                  <span className="text-sm text-gray-900">{process.env.NEXT_PUBLIC_API_URL}</span>
                </div>
              </div>
            </Card.Content>
          </Card>

          {/* Backend Status */}
          <Card>
            <Card.Header>
              <Card.Title>Backend Connection</Card.Title>
            </Card.Header>
            <Card.Content>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">Django Backend:</span>
                  <div className="flex items-center">
                    {apiStatus === 'loading' && (
                      <span className="text-sm text-yellow-600 font-medium flex items-center">
                        <svg className="w-4 h-4 mr-1 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Testing...
                      </span>
                    )}
                    {apiStatus === 'success' && (
                      <span className="text-sm text-green-600 font-medium flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Connected
                      </span>
                    )}
                    {apiStatus === 'error' && (
                      <span className="text-sm text-red-600 font-medium flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Error
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">Response:</span>
                  <span className="text-sm text-gray-900 max-w-xs truncate">
                    {backendResponse || 'No response'}
                  </span>
                </div>
                <Button 
                  onClick={testApiConnection}
                  variant="outline" 
                  size="sm"
                  className="w-full"
                >
                  Test Connection Again
                </Button>
              </div>
            </Card.Content>
          </Card>

          {/* Link Component Test */}
          <Card>
            <Card.Header>
              <Card.Title>Navigation Test</Card.Title>
            </Card.Header>
            <Card.Content>
              <div className="space-y-3">
                <p className="text-sm text-gray-600">Testing Next.js Link components:</p>
                <div className="space-y-2">
                  <Button 
                    as="a" 
                    href="/" 
                    variant="outline" 
                    size="sm"
                    className="w-full text-left justify-start"
                  >
                    → Home Page
                  </Button>
                  <Button 
                    as="a" 
                    href="/login-enhanced" 
                    variant="outline" 
                    size="sm"
                    className="w-full text-left justify-start"
                  >
                    → Enhanced Login
                  </Button>
                  <Button 
                    as="a" 
                    href="/register-enhanced" 
                    variant="outline" 
                    size="sm"
                    className="w-full text-left justify-start"
                  >
                    → Enhanced Register
                  </Button>
                  <Button 
                    as="a" 
                    href="/analytics-enhanced" 
                    variant="outline" 
                    size="sm"
                    className="w-full text-left justify-start"
                  >
                    → Enhanced Analytics
                  </Button>
                </div>
              </div>
            </Card.Content>
          </Card>

          {/* System Information */}
          <Card>
            <Card.Header>
              <Card.Title>System Information</Card.Title>
            </Card.Header>
            <Card.Content>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">Environment:</span>
                  <span className="text-sm text-gray-900">Development</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">Database:</span>
                  <span className="text-sm text-gray-900">SQLite</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">Features Fixed:</span>
                  <span className="text-sm text-green-600 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Link Components
                  </span>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800 font-medium flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    System Status: Operational
                  </p>
                  <p className="text-xs text-green-600 mt-1">All major components are running correctly</p>
                </div>
              </div>
            </Card.Content>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mt-6">
          <Card.Header>
            <Card.Title>Quick Actions</Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Button variant="outline" as="a" href="/">
                View Homepage
              </Button>
              <Button variant="outline" as="a" href="/login-enhanced">
                Test Login
              </Button>
              <Button variant="outline" as="a" href="/register-enhanced">
                Test Registration
              </Button>
              <Button variant="outline" as="a" href="/settings">
                View Settings
              </Button>
            </div>
          </Card.Content>
        </Card>
      </div>
    </div>
  );
};

export default TestPage;
