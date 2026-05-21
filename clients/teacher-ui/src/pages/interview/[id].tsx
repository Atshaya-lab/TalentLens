import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import InterviewSessionComponent from '../../components/InterviewSession';
import { InterviewSession } from '../../types';
import Loading from '../../components/ui/Loading';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

const InterviewSessionPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const { isAuthenticated } = useAuth();
  const [sessionId, setSessionId] = useState<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (id && typeof id === 'string') {
      setSessionId(parseInt(id, 10));
    }
  }, [id, isAuthenticated, router]);

  const handleComplete = (session: InterviewSession) => {
    // Redirect to results page or back to interviews
    router.push({
      pathname: '/interview/results',
      query: { id: session.id }
    });
  };

  const handleExit = () => {
    router.push('/interviews');
  };

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  return (
    <InterviewSessionComponent
      sessionId={sessionId}
      onComplete={handleComplete}
      onExit={handleExit}
    />
  );
};

export default InterviewSessionPage;

export async function getServerSideProps() {
  return {
    props: {}
  };
}
