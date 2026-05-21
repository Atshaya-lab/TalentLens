import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../utils/api';
import { Resume } from '../types';
import { formatDate, formatFileSize } from '../utils/helpers';
import Loading from '../components/ui/Loading';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { useToast } from '../hooks';

const ResumesPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'preview' | 'analysis'>('overview');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const { showToast } = useToast();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/signin');
      return;
    }
    
    if (user?.role !== 'student') {
      router.push('/dashboard');
      return;
    }
    
    fetchResume();
  }, [isAuthenticated, user, router]);

  const fetchResume = async () => {
    try {
      setLoading(true);
      const response = await apiService.getResumes();
      // Handle paginated response
      const resumes = response.data.results || response.data;
      if (Array.isArray(resumes) && resumes.length > 0) {
        // Get the first resume ID and fetch full details
        const resumeId = resumes[0].id;
        const detailResponse = await apiService.getResume(resumeId);
        setResume(detailResponse.data);
        // Note: No file_url available since backend only stores text content
        setPdfUrl(null);
      }
    } catch (error: any) {
      console.error('Error fetching resume:', error);
      if (error.response?.status !== 404) {
        showToast('Failed to load resume', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (fileUrl: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('Text copied to clipboard!', 'success');
    } catch (error) {
      console.error('Failed to copy text:', error);
      showToast('Failed to copy text', 'error');
    }
  };

  const highlightText = (text: string, searchTerm: string) => {
    if (!searchTerm.trim()) return text;
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '==HIGHLIGHT_START==$1==HIGHLIGHT_END==');
  };

  const renderHighlightedText = (text: string) => {
    const parts = text.split(/==HIGHLIGHT_START==|==HIGHLIGHT_END==/);
    return parts.map((part, index) => 
      index % 2 === 1 ? (
        <mark key={index} className="bg-yellow-200 px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const handlePrint = () => {
    if (pdfUrl) {
      const printWindow = window.open(pdfUrl, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    }
  };

  if (loading) {
    return (
      <Layout>
        <Loading size="lg" text="Loading your resume..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Enhanced Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-3xl p-8 text-white shadow-2xl">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
          
          <div className="relative text-center">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold mb-2">My Resume</h1>
                <p className="text-emerald-100 text-lg">
                  View your resume uploaded by your teacher
                </p>
              </div>
            </div>
            
            {/* Quick Stats Row */}
            <div className="flex flex-wrap justify-center gap-4">
              <div className="flex items-center gap-2 bg-white/10 rounded-lg px-4 py-2 backdrop-blur-sm">
                <svg className="w-4 h-4 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-medium">Uploaded: {resume ? formatDate(resume.upload_date || resume.created_at || '') : 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 rounded-lg px-4 py-2 backdrop-blur-sm">
                <svg className="w-4 h-4 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm font-medium">Status: {resume?.is_active ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
          </div>
        </div>

        {resume ? (
          <div className="space-y-6">
            {/* Enhanced Tab Navigation */}
            <div className="bg-white rounded-2xl shadow-lg p-1 border border-gray-100">
              <nav className="flex space-x-1">
                {[
                  { 
                    id: 'overview', 
                    label: 'Overview', 
                    icon: (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    )
                  },
                  { 
                    id: 'preview', 
                    label: 'Content Preview', 
                    icon: (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )
                  },
                  { 
                    id: 'analysis', 
                    label: 'AI Analysis', 
                    icon: (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    )
                  }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    } flex items-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Enhanced Resume Overview Card */}
                <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50/50">
                  <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <span className="text-xl font-bold">{resume.title || 'My Resume'}</span>
                      </div>
                      <span className={`px-4 py-2 rounded-full text-sm font-semibold border ${
                        resume.is_active 
                          ? 'bg-green-100 text-green-800 border-green-200' 
                          : 'bg-gray-100 text-gray-800 border-gray-200'
                      }`}>
                        {resume.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Uploaded Date</p>
                        <p className="font-medium">{formatDate(resume.upload_date || resume.created_at || '')}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">File Size</p>
                        <p className="font-medium">
                          {resume.file_size ? formatFileSize(resume.file_size) : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Experience</p>
                        <p className="font-medium">
                          {resume.experience_years ? `${resume.experience_years} years` : 'Not specified'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Last Analyzed</p>
                        <p className="font-medium">
                          {resume.last_analyzed ? formatDate(resume.last_analyzed) : 'Not analyzed yet'}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3 justify-center">
                      <button
                        onClick={() => setActiveTab('preview')}
                        className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View Content
                      </button>
                      <button
                        onClick={() => setActiveTab('analysis')}
                        className="inline-flex items-center px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        View Analysis
                      </button>
                    </div>
                  </CardContent>
                </Card>

                {/* Skills Section */}
                {((resume.extracted_skills && resume.extracted_skills.length > 0) || 
                  (resume.skills_extracted && resume.skills_extracted.length > 0)) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <span>🚀</span>
                        Extracted Skills
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {(resume.extracted_skills || resume.skills_extracted || []).map((skill, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Technologies Section */}
                {resume.technologies && resume.technologies.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <span>⚡</span>
                        Technologies
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {resume.technologies.map((tech, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full font-medium"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Job Titles Section */}
                {resume.job_titles && resume.job_titles.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <span>💼</span>
                        Relevant Job Titles
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {resume.job_titles.map((title, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full font-medium"
                          >
                            {title}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Resume Statistics */}
                {resume.content && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <span>📊</span>
                        Resume Statistics
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">
                            {resume.content.split(/\s+/).length}
                          </div>
                          <div className="text-sm text-gray-600">Words</div>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            {resume.content.length}
                          </div>
                          <div className="text-sm text-gray-600">Characters</div>
                        </div>
                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">
                            {(resume.extracted_skills || resume.skills_extracted || []).length}
                          </div>
                          <div className="text-sm text-gray-600">Skills</div>
                        </div>
                        <div className="text-center p-4 bg-orange-50 rounded-lg">
                          <div className="text-2xl font-bold text-orange-600">
                            {(resume.technologies || []).length}
                          </div>
                          <div className="text-sm text-gray-600">Technologies</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Content Preview Tab */}
            {activeTab === 'preview' && (
              <div className="space-y-6">
                {/* Text Content Preview */}
                {resume.content ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>📝</span>
                          Text Content
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Search in content..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="pl-8 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <svg className="w-4 h-4 text-gray-400 absolute left-2.5 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </div>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-gray-50 p-6 rounded-lg max-h-96 overflow-y-auto">
                        <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                          {renderHighlightedText(highlightText(resume.content, searchTerm))}
                        </pre>
                      </div>
                      <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
                        <div className="flex items-center gap-4">
                          <span>Character count: {resume.content.length}</span>
                          {searchTerm && (
                            <span className="text-blue-600">
                              {(resume.content.match(new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length} matches found
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleCopyText(resume.content || '')}
                          className="inline-flex items-center px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy Text
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="text-center py-12">
                      <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                        <span className="text-4xl">📄</span>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">No Content Available</h3>
                      <p className="text-gray-600 max-w-md mx-auto">
                        The resume content is not available for preview. This might be due to processing issues 
                        or the resume hasn&apos;t been fully processed yet.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* AI Analysis Tab */}
            {activeTab === 'analysis' && (
              <div className="space-y-6">
                {(resume.analysis_result || resume.analysis) ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <span>🤖</span>
                        AI Analysis Results
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {resume.analysis && typeof resume.analysis === 'object' ? (
                        <div className="space-y-6">
                          {/* Overall Score */}
                          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-lg font-semibold">Overall Score</h3>
                              <span className="text-3xl font-bold text-blue-600">
                                {resume.analysis.overall_score || 'N/A'}/100
                              </span>
                            </div>
                            
                            {/* Score Breakdown */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                              <div className="text-center">
                                <div className="text-xl font-bold text-green-600">
                                  {resume.analysis.content_quality_score || 'N/A'}
                                </div>
                                <div className="text-sm text-gray-600">Content Quality</div>
                              </div>
                              <div className="text-center">
                                <div className="text-xl font-bold text-blue-600">
                                  {resume.analysis.formatting_score || 'N/A'}
                                </div>
                                <div className="text-sm text-gray-600">Formatting</div>
                              </div>
                              <div className="text-center">
                                <div className="text-xl font-bold text-purple-600">
                                  {resume.analysis.keywords_score || 'N/A'}
                                </div>
                                <div className="text-sm text-gray-600">Keywords</div>
                              </div>
                              <div className="text-center">
                                <div className="text-xl font-bold text-orange-600">
                                  {resume.analysis.experience_relevance_score || 'N/A'}
                                </div>
                                <div className="text-sm text-gray-600">Experience</div>
                              </div>
                            </div>
                          </div>

                          {/* Strengths */}
                          {resume.analysis.strengths && resume.analysis.strengths.length > 0 && (
                            <Card>
                              <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-green-600">
                                  <span>💪</span>
                                  Strengths
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="flex flex-wrap gap-2">
                                  {resume.analysis.strengths.map((strength: string, index: number) => (
                                    <span
                                      key={index}
                                      className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full font-medium"
                                    >
                                      {strength}
                                    </span>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          )}

                          {/* Weaknesses */}
                          {resume.analysis.weaknesses && resume.analysis.weaknesses.length > 0 && (
                            <Card>
                              <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-red-600">
                                  <span>⚠️</span>
                                  Areas for Improvement
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="flex flex-wrap gap-2">
                                  {resume.analysis.weaknesses.map((weakness: string, index: number) => (
                                    <span
                                      key={index}
                                      className="px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full font-medium"
                                    >
                                      {weakness}
                                    </span>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          )}

                          {/* Suggestions */}
                          {resume.analysis.suggestions && resume.analysis.suggestions.length > 0 && (
                            <Card>
                              <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-blue-600">
                                  <span>💡</span>
                                  Suggestions
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <ul className="space-y-2">
                                  {resume.analysis.suggestions.map((suggestion: string, index: number) => (
                                    <li key={index} className="flex items-start gap-2">
                                      <span className="text-blue-500 mt-1">•</span>
                                      <span className="text-gray-700">{suggestion}</span>
                                    </li>
                                  ))}
                                </ul>
                              </CardContent>
                            </Card>
                          )}

                          {/* Recommended Roles */}
                          {resume.analysis.recommended_roles && resume.analysis.recommended_roles.length > 0 && (
                            <Card>
                              <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-purple-600">
                                  <span>🎯</span>
                                  Recommended Roles
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="flex flex-wrap gap-2">
                                  {resume.analysis.recommended_roles.map((role: string, index: number) => (
                                    <span
                                      key={index}
                                      className="px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full font-medium"
                                    >
                                      {role}
                                    </span>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          )}

                          {/* Skill Gaps */}
                          {resume.analysis.skill_gaps && resume.analysis.skill_gaps.length > 0 && (
                            <Card>
                              <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-orange-600">
                                  <span>📚</span>
                                  Skill Gaps to Address
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="flex flex-wrap gap-2">
                                  {resume.analysis.skill_gaps.map((gap: string, index: number) => (
                                    <span
                                      key={index}
                                      className="px-3 py-1 bg-orange-100 text-orange-800 text-sm rounded-full font-medium"
                                    >
                                      {gap}
                                    </span>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      ) : (
                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg">
                          <div className="prose max-w-none">
                            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                              {resume.analysis_result}
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="text-center py-12">
                      <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                        <span className="text-4xl">🤖</span>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">No AI Analysis Available</h3>
                      <p className="text-gray-600 mb-4 max-w-md mx-auto">
                        Your resume hasn&apos;t been analyzed by our AI system yet. The analysis will provide insights
                        about your skills, experience, and suggestions for improvement.
                      </p>
                      <button
                        onClick={fetchResume}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Check Again
                      </button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        ) : (
          /* No Resume State */
          <Card>
            <CardContent className="text-center py-12">
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">No Resume Uploaded</h3>
              <p className="text-gray-600 mb-4 max-w-md mx-auto">
                Your teacher hasn&apos;t uploaded a resume for you yet. Once your teacher uploads your resume, 
                you&apos;ll be able to view it here, see AI analysis, and download it for your use.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-left">
                    <p className="text-sm font-medium text-blue-800 mb-1">Why can&apos;t I upload my resume?</p>
                    <p className="text-sm text-blue-700">
                      To ensure quality and consistency, only teachers can upload and manage student resumes. 
                      Contact your teacher if you need your resume uploaded or updated.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default ResumesPage;

// Prevent static generation for this page since it requires authentication
export const getServerSideProps = async () => {
  return {
    props: {},
  };
};