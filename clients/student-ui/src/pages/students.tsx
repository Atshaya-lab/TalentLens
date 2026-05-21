import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../utils/api';
import { User } from '../types';
import { formatDate } from '../utils/helpers';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Loading from '../components/ui/Loading';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '../components/ui/Card';
import { useToast } from '../hooks';

interface StudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: User | null;
  onSuccess: () => void;
}

const StudentModal: React.FC<StudentModalProps> = ({ isOpen, onClose, student, onSuccess }) => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (student) {
      setFormData({
        first_name: student.first_name,
        last_name: student.last_name,
        email: student.email,
        is_active: student.is_active,
      });
    } else {
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        is_active: true,
      });
    }
  }, [student]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (student) {
        await apiService.updateUser(student.id, formData);
        showToast('Student updated successfully!', 'success');
      } else {
        await apiService.register({
          ...formData,
          password: 'temporary123',
          password_confirm: 'temporary123',
          role: 'student',
        });
        showToast('Student created successfully!', 'success');
      }
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving student:', error);
      const errorMessage = error.response?.data?.message || 'Failed to save student';
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={student ? 'Edit Student' : 'Add New Student'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              First Name *
            </label>
            <input
              type="text"
              value={formData.first_name}
              onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Last Name *
            </label>
            <input
              type="text"
              value={formData.last_name}
              onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email *
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            required
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="is_active"
            checked={formData.is_active}
            onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
          />
          <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
            Active Account
          </label>
        </div>

        {!student && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> A temporary password will be assigned. The student should change it on first login.
            </p>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={loading}
          >
            {student ? 'Update Student' : 'Create Student'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const StudentsPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const { showToast } = useToast();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    
    if (user?.role !== 'administrator' && user?.role !== 'teacher') {
      router.push('/dashboard');
      return;
    }
    
    fetchStudents();
  }, [isAuthenticated, user?.role, router]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await apiService.getUsers({ role: 'student' });
      setStudents(response.data.results);
    } catch (error) {
      console.error('Error fetching students:', error);
      showToast('Failed to load students', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (student: User) => {
    setSelectedStudent(student);
    setModalOpen(true);
  };

  const handleDelete = async (studentId: number) => {
    if (!confirm('Are you sure you want to delete this student? This action cannot be undone.')) {
      return;
    }

    try {
      await apiService.deleteUser(studentId);
      setStudents(prev => prev.filter(student => student.id !== studentId));
      showToast('Student deleted successfully', 'success');
    } catch (error: any) {
      console.error('Delete error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to delete student';
      showToast(errorMessage, 'error');
    }
  };

  const handleToggleStatus = async (student: User) => {
    try {
      const updatedStudent = await apiService.updateUser(student.id, {
        is_active: !student.is_active
      });
      
      setStudents(prev => 
        prev.map(s => s.id === student.id ? updatedStudent.data : s)
      );
      
      showToast(
        `Student ${updatedStudent.data.is_active ? 'activated' : 'deactivated'} successfully`,
        'success'
      );
    } catch (error: any) {
      console.error('Status toggle error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update student status';
      showToast(errorMessage, 'error');
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'active' && student.is_active) ||
      (statusFilter === 'inactive' && !student.is_active);

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <Layout>
        <Loading />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Student Management</h1>
            <p className="mt-2 text-gray-600">
              Manage student accounts and monitor their progress
            </p>
          </div>
          <Button onClick={() => {
            setSelectedStudent(null);
            setModalOpen(true);
          }}>
            Add New Student
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search students by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex space-x-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Students</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Students List */}
        {filteredStudents.length === 0 ? (
          <Card className="text-center py-12">
            <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No students found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'Start by adding your first student'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <Button onClick={() => {
                setSelectedStudent(null);
                setModalOpen(true);
              }}>
                Add First Student
              </Button>
            )}
          </Card>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {filteredStudents.map((student) => (
                <li key={student.id}>
                  <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                            <span className="text-primary-600 font-medium text-sm">
                              {student.first_name.charAt(0)}{student.last_name.charAt(0)}
                            </span>
                          </div>
                        </div>
                        
                        <div className="ml-4">
                          <div className="flex items-center">
                            <p className="text-sm font-medium text-gray-900">
                              {student.first_name} {student.last_name}
                            </p>
                            <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              student.is_active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {student.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center text-sm text-gray-500">
                            <svg className="flex-shrink-0 mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                            </svg>
                            {student.email}
                          </div>
                          <div className="mt-1 text-sm text-gray-500">
                            Joined {formatDate(student.date_joined)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleStatus(student)}
                        >
                          {student.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(student)}
                        >
                          Edit
                        </Button>
                        
                        {user?.role === 'administrator' && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDelete(student.id)}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5">
                  <p className="text-sm font-medium text-gray-500">Total Students</p>
                  <p className="text-2xl font-semibold text-gray-900">{students.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5">
                  <p className="text-sm font-medium text-gray-500">Active Students</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {students.filter(s => s.is_active).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5">
                  <p className="text-sm font-medium text-gray-500">Inactive Students</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {students.filter(s => !s.is_active).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Student Modal */}
      <StudentModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedStudent(null);
        }}
        student={selectedStudent}
        onSuccess={fetchStudents}
      />
    </Layout>
  );
};

export default StudentsPage;

// Prevent static generation for this page since it requires authentication
export const getServerSideProps = async () => {
  return {
    props: {},
  };
};
