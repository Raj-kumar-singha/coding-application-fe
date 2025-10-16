import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

const Dashboard = () => {
  const [topics, setTopics] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    remaining: 0,
    percentage: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [topicsResponse, statsResponse, progressResponse] = await Promise.all([
        api.get('/topics'),
        api.get('/progress/stats').catch(() => ({ data: { total: 0, completed: 0, remaining: 0, percentage: 0 } })),
        api.get('/progress').catch(() => ({ data: [] }))
      ]);
      
      const topicsData = topicsResponse.data;
      const userProgress = progressResponse.data;
      
      // Create a map of completed problems for quick lookup
      const completedProblems = new Set();
      userProgress.forEach(progress => {
        if (progress.completed) {
          completedProblems.add(progress.problemId._id);
        }
      });
      
      // Update topics with progress information
      const topicsWithProgress = topicsData.map(topic => ({
        ...topic,
        problems: topic.problems.map(problem => ({
          ...problem,
          completed: completedProblems.has(problem._id)
        }))
      }));
      
      setTopics(topicsWithProgress);
      
      // Calculate total problems from topics if stats API fails
      const totalProblems = topicsData.reduce((total, topic) => total + (topic.problems ? topic.problems.length : 0), 0);
      const completedCount = userProgress.filter(p => p.completed).length;
      
      if (statsResponse.data && statsResponse.data.total > 0) {
        setStats(statsResponse.data);
      } else {
        setStats({
          total: totalProblems,
          completed: completedCount,
          remaining: totalProblems - completedCount,
          percentage: totalProblems > 0 ? Math.round((completedCount / totalProblems) * 100) : 0
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      // Set default stats if there's an error
      setStats({ total: 0, completed: 0, remaining: 0, percentage: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresh data when user returns to dashboard or progress is updated
  useEffect(() => {
    const handleFocus = () => {
      fetchData();
    };

    const handleProgressUpdate = () => {
      fetchData();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('progressUpdated', handleProgressUpdate);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('progressUpdated', handleProgressUpdate);
    };
  }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">DSA Sheet Dashboard</h1>
            <p className="text-gray-600">Track your progress through data structures and algorithms</p>
          </div>
          <button
            onClick={fetchData}
            className="btn btn-secondary"
            title="Refresh progress"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="stats-card card text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Total Problems</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-success-600 card text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Completed</p>
              <p className="text-2xl font-bold">{stats.completed}</p>
            </div>
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-warning-600 card text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Remaining</p>
              <p className="text-2xl font-bold">{stats.remaining}</p>
            </div>
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-primary-600 card text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Progress</p>
              <p className="text-2xl font-bold">{stats.percentage}%</p>
            </div>
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Overall Progress</span>
          <span className="text-sm text-gray-500">{stats.completed}/{stats.total} problems</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-primary-600 h-3 rounded-full progress-bar"
            style={{ width: `${stats.percentage}%` }}
          ></div>
        </div>
      </div>

      {/* Topics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {topics.map((topic) => {
          const totalProblems = topic.problems ? topic.problems.length : 0;
          const completedProblems = topic.problems ? topic.problems.filter(problem => problem.completed).length : 0;
          const topicPercentage = totalProblems > 0 ? Math.round((completedProblems / totalProblems) * 100) : 0;

          return (
            <Link
              key={topic._id}
              to={`/topic/${topic._id}`}
              className="card problem-card hover:shadow-lg transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{topic.title}</h3>
                <span className="text-sm text-gray-500">{completedProblems}/{totalProblems}</span>
              </div>
              
              <p className="text-gray-600 text-sm mb-4">{topic.description}</p>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Progress</span>
                  <span className="text-xs text-gray-500">{topicPercentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary-600 h-2 rounded-full progress-bar"
                    style={{ width: `${topicPercentage}%` }}
                  ></div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;
