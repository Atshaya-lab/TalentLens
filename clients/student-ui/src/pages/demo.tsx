import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';

const DemoPage: React.FC = () => {
  const router = useRouter();
  const [activeDemo, setActiveDemo] = useState<'interview' | 'resume' | 'analytics'>('interview');

  const demoFeatures = {
    interview: {
      title: "AI-Powered Interview Practice",
      description: "Experience realistic interview scenarios with AI feedback",
      mockData: {
        question: "Tell me about a challenging project you worked on and how you overcame obstacles.",
        feedback: "Great structure! Consider adding more specific metrics to strengthen your impact statement.",
        score: 85,
        improvements: ["Add quantifiable results", "Maintain better eye contact", "Speak more slowly for clarity"]
      }
    },
    resume: {
      title: "Resume Analysis & Optimization",
      description: "Get detailed feedback on your resume structure and content",
      mockData: {
        score: 78,
        strengths: ["Strong technical skills section", "Clear work experience", "Good formatting"],
        improvements: ["Add more action verbs", "Include specific achievements", "Optimize for ATS systems"],
        suggestions: ["Use 'Developed' instead of 'Worked on'", "Add metrics to show impact", "Include relevant keywords"]
      }
    },
    analytics: {
      title: "Progress Tracking & Analytics",
      description: "Monitor your improvement with detailed performance metrics",
      mockData: {
        overallScore: 82,
        trend: "+15% this week",
        sessionsCompleted: 12,
        averageScore: 79,
        strongAreas: ["Technical Questions", "Problem Solving"],
        improvementAreas: ["Behavioral Questions", "Communication Skills"]
      }
    }
  };

  const currentDemo = demoFeatures[activeDemo];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">TL</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">TalentLens Demo</h1>
                <p className="text-sm text-gray-500">Interactive Preview</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="outline" size="sm">
                  ← Back to Home
                </Button>
              </Link>
              <Link href="/signin">
                <Button size="sm">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Demo Navigation */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Experience TalentLens</h1>
          <p className="text-xl text-gray-600 mb-8">Try our features with interactive demos</p>
          
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <Button
              variant={activeDemo === 'interview' ? 'primary' : 'outline'}
              onClick={() => setActiveDemo('interview')}
              className="px-6 py-3"
            >
              🎯 Interview Practice
            </Button>
            <Button
              variant={activeDemo === 'resume' ? 'primary' : 'outline'}
              onClick={() => setActiveDemo('resume')}
              className="px-6 py-3"
            >
              📄 Resume Analysis
            </Button>
            <Button
              variant={activeDemo === 'analytics' ? 'primary' : 'outline'}
              onClick={() => setActiveDemo('analytics')}
              className="px-6 py-3"
            >
              📊 Progress Analytics
            </Button>
          </div>
        </div>

        {/* Demo Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Demo Interface */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{currentDemo.title}</h2>
              <p className="text-gray-600 mb-6">{currentDemo.description}</p>

              {/* Interview Demo */}
              {activeDemo === 'interview' && (
                <div className="space-y-6">
                  <div className="bg-blue-50 rounded-lg p-6">
                    <h3 className="font-semibold text-blue-900 mb-3">🤖 AI Interviewer</h3>
                    <p className="text-blue-800">{(currentDemo.mockData as any)?.question || ""}</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="font-semibold text-gray-900 mb-3">🎤 Your Response</h3>
                    <div className="bg-white rounded-lg p-4 border-2 border-dashed border-gray-300">
                      <p className="text-gray-500 italic">Recording simulation would appear here...</p>
                      <div className="mt-4 flex items-center space-x-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="text-sm text-gray-600">Recording: 0:45</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 rounded-lg p-6">
                    <h3 className="font-semibold text-green-900 mb-3">✅ AI Feedback</h3>
                    <p className="text-green-800 mb-3">{(currentDemo.mockData as any)?.feedback || ""}</p>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-green-700">Score:</span>
                      <div className="bg-green-500 text-white px-2 py-1 rounded text-sm font-medium">
                        {(currentDemo.mockData as any)?.score}/100
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Resume Demo */}
              {activeDemo === 'resume' && (
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="font-semibold text-gray-900 mb-3">📄 Resume Upload</h3>
                    <div className="bg-white rounded-lg p-4 border-2 border-dashed border-gray-300">
                      <div className="text-center py-8">
                        <div className="text-4xl mb-2">📄</div>
                        <p className="text-gray-500">John_Doe_Resume.pdf</p>
                        <p className="text-sm text-gray-400">Uploaded • 2.3 MB</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-6">
                    <h3 className="font-semibold text-blue-900 mb-3">🎯 Analysis Results</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-blue-800">Overall Score</span>
                        <span className="bg-blue-500 text-white px-3 py-1 rounded font-medium">
                          {(currentDemo.mockData as any)?.score}/100
                        </span>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${(currentDemo.mockData as any)?.score}%` } }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 rounded-lg p-6">
                    <h3 className="font-semibold text-green-900 mb-3">✅ Strengths</h3>
                    <ul className="space-y-2">
                      {((currentDemo.mockData as any)?.strengths || []).map((strength, index) => (
                        <li key={index} className="flex items-center space-x-2">
                          <span className="text-green-600">•</span>
                          <span className="text-green-800">{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Analytics Demo */}
              {activeDemo === 'analytics' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-900">{(currentDemo.mockData as any)?.overallScore}</div>
                      <div className="text-sm text-blue-600">Overall Score</div>
                      <div className="text-xs text-green-600">{(currentDemo.mockData as any)?.trend}</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-green-900">{(currentDemo.mockData as any)?.sessionsCompleted}</div>
                      <div className="text-sm text-green-600">Sessions Completed</div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="font-semibold text-gray-900 mb-3">📈 Performance Trends</h3>
                    <div className="bg-white rounded-lg p-4">
                      <div className="flex items-end justify-between h-32 space-x-2">
                        {[65, 70, 75, 78, 82, 85, 88].map((score, index) => (
                          <div key={index} className="flex-1 bg-blue-500 rounded-t" style={{ height: `${score}%` }}>
                            <div className="text-xs text-white text-center mt-1">{score}</div>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 mt-2">
                        <span>Week 1</span>
                        <span>Week 7</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-green-50 rounded-lg p-4">
                      <h4 className="font-semibold text-green-900 mb-2">💪 Strong Areas</h4>
                      <ul className="space-y-1">
                        {(currentDemo.mockData as any)?.strongAreas?.map((area, index) => (
                          <li key={index} className="text-sm text-green-800 flex items-center space-x-2">
                            <span>✅</span>
                            <span>{area}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4">
                      <h4 className="font-semibold text-orange-900 mb-2">🎯 Focus Areas</h4>
                      <ul className="space-y-1">
                        {(currentDemo.mockData as any)?.improvementAreas?.map((area, index) => (
                          <li key={index} className="text-sm text-orange-800 flex items-center space-x-2">
                            <span>🔄</span>
                            <span>{area}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Information Panel */}
          <div className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl">🚀 Ready to Get Started?</CardTitle>
                <CardDescription>
                  This is just a preview! The full platform offers much more comprehensive features.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">What&apos;s Next?</h3>
                    <ul className="space-y-2 text-sm text-blue-800">
                      <li>• Contact your teacher for account creation</li>
                      <li>• Complete your profile setup</li>
                      <li>• Start with your first interview practice</li>
                      <li>• Track your progress over time</li>
                    </ul>
                  </div>
                  
                  <div className="flex flex-col space-y-3">
                    <Link href="/signin">
                      <Button className="w-full" size="lg">
                        🎯 Sign In to Start
                      </Button>
                    </Link>
                    <Link href="/">
                      <Button variant="outline" className="w-full">
                        ← Back to Home
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">💡 Pro Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start space-x-2">
                    <span className="text-blue-500">🎯</span>
                    <div>
                      <p className="font-medium">Practice Regularly</p>
                      <p className="text-gray-600">Consistency is key to improvement</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-green-500">📊</span>
                    <div>
                      <p className="font-medium">Review Your Analytics</p>
                      <p className="text-gray-600">Track patterns and focus on weak areas</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-purple-500">🔄</span>
                    <div>
                      <p className="font-medium">Iterate on Feedback</p>
                      <p className="text-gray-600">Apply suggestions in your next session</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DemoPage;
