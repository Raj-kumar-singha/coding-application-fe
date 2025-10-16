import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';

const TopicDetail = () => {
  const { id } = useParams();
  const [topic, setTopic] = useState(null);
  const [userProgress, setUserProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingProblems, setUpdatingProblems] = useState(new Set());

  const fetchData = useCallback(async () => {
    try {
      const [topicResponse, progressResponse] = await Promise.all([
        api.get(`/topics/${id}`),
        api.get('/progress')
      ]);
      
      setTopic(topicResponse.data);
      setUserProgress(progressResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleProblemProgress = async (problemId, completed) => {
    // Add to updating set to show loading state
    setUpdatingProblems(prev => new Set(prev).add(problemId));
    
    try {
      const newCompletedState = !completed;
      
      // Optimistic update - update UI immediately
      setUserProgress(prev => {
        const existingProgress = prev.find(p => p.problemId._id === problemId);
        
        if (existingProgress) {
          // Update existing progress
          return prev.map(progress => 
            progress.problemId._id === problemId 
              ? { ...progress, completed: newCompletedState }
              : progress
          );
        } else {
          // Create new progress entry
          const newProgress = {
            problemId: { _id: problemId },
            completed: newCompletedState,
            _id: `temp-${problemId}-${Date.now()}` // Temporary ID
          };
          return [...prev, newProgress];
        }
      });
      
      // Make API call
      await api.post(`/progress/${problemId}`, { completed: newCompletedState });
      
      // Notify parent component to refresh dashboard
      window.dispatchEvent(new CustomEvent('progressUpdated'));
    } catch (error) {
      console.error('Error updating progress:', error);
      
      // Revert optimistic update on error
      setUserProgress(prev => 
        prev.map(progress => 
          progress.problemId._id === problemId 
            ? { ...progress, completed: completed } // Revert to original state
            : progress
        ).filter(progress => !progress._id.startsWith('temp-')) // Remove temporary entries
      );
    } finally {
      // Remove from updating set
      setUpdatingProblems(prev => {
        const newSet = new Set(prev);
        newSet.delete(problemId);
        return newSet;
      });
    }
  };

  const isProblemCompleted = (problemId) => {
    const progress = userProgress.find(p => p.problemId._id === problemId);
    return progress ? progress.completed : false;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Topic not found</h1>
          <Link to="/dashboard" className="btn btn-primary mt-4">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const completedProblems = topic.problems.filter(problem => 
    isProblemCompleted(problem._id)
  ).length;
  const totalProblems = topic.problems.length;
  const percentage = totalProblems > 0 ? Math.round((completedProblems / totalProblems) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link to="/dashboard" className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
          ← Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{topic.title}</h1>
        <p className="text-gray-600 mb-4">{topic.description}</p>
        
        {/* Progress Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm text-gray-500">{completedProblems}/{totalProblems} problems</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-primary-600 h-3 rounded-full progress-bar"
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 mt-2">{percentage}% completed</p>
        </div>
      </div>

      {/* Problems List */}
      <div className="space-y-4">
        {topic.problems.map((problem, index) => {
          const isCompleted = isProblemCompleted(problem._id);
          const isUpdating = updatingProblems.has(problem._id);
          
          return (
            <div
              key={problem._id}
              className={`card problem-card ${isCompleted ? 'bg-green-50 border-green-200' : ''} ${isUpdating ? 'opacity-75' : ''}`}
            >
              <div className="flex items-start space-x-4">
                {/* Checkbox */}
                <div className="flex-shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={isCompleted}
                    disabled={isUpdating}
                    onChange={() => toggleProblemProgress(problem._id, isCompleted)}
                    className={`checkbox-custom ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  />
                  {isUpdating && (
                    <div className="absolute -mt-1 -ml-1">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                    </div>
                  )}
                </div>

                {/* Problem Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-sm text-gray-500">#{index + 1}</span>
                    <h3 className="text-lg font-semibold text-gray-900">{problem.title}</h3>
                    <span className={`difficulty-badge difficulty-${problem.difficulty.toLowerCase()}`}>
                      {problem.difficulty}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 mb-3">{problem.description}</p>
                  
                  {/* Tags */}
                  {problem.tags && problem.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {problem.tags.map((tag, tagIndex) => (
                        <span
                          key={tagIndex}
                          className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Links */}
                  <div className="flex flex-wrap gap-4">
                    {problem.links.youtube && (
                      <a
                        href={problem.links.youtube}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-1 text-red-600 hover:text-red-700 link-icon"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                        </svg>
                        <span className="text-sm">YouTube</span>
                      </a>
                    )}
                    
                    {problem.links.leetcode && (
                      <a
                        href={problem.links.leetcode}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-1 text-yellow-600 hover:text-yellow-700 link-icon"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.818l4.277 4.193.039.038c2.248 2.165 5.852 2.133 8.063-.074l2.396-2.392c.54-.54.54-1.414.003-1.955a1.378 1.378 0 0 0-1.951-.003l-2.396 2.392a3.021 3.021 0 0 1-4.205.038l-.02-.019-4.276-4.193c-.652-.64-.972-1.469-.948-2.263a2.68 2.68 0 0 1 .066-.523 2.545 2.545 0 0 1 .619-1.164L9.13 8.114c1.058-1.134 3.204-1.27 4.43-.278l2.396 2.392c.54.54.54 1.414.003 1.955a1.378 1.378 0 0 1-1.951.003l-2.396-2.392a.993.993 0 0 0-1.376.038l-.019.02-1.99 2.133a.993.993 0 0 0-.038 1.376l.02.019 1.99 2.133c.64.652 1.469.972 2.263.948a2.68 2.68 0 0 0 .523-.066 2.545 2.545 0 0 0 1.164-.619l4.277-4.193c2.248-2.165 2.248-5.675 0-7.84L13.444.439A1.374 1.374 0 0 0 13.483 0z"/>
                        </svg>
                        <span className="text-sm">LeetCode</span>
                      </a>
                    )}
                    
                    {problem.links.codeforces && (
                      <a
                        href={problem.links.codeforces}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 link-icon"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M4.5 7.5A1.5 1.5 0 0 1 6 9v10.5A1.5 1.5 0 0 1 4.5 21h-3A1.5 1.5 0 0 1 0 19.5V9a1.5 1.5 0 0 1 1.5-1.5h3zm9-4.5A1.5 1.5 0 0 1 15 4.5v15a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 19.5v-15A1.5 1.5 0 0 1 10.5 3h3zm9 7.5A1.5 1.5 0 0 1 24 12v7.5a1.5 1.5 0 0 1-1.5 1.5h-3a1.5 1.5 0 0 1-1.5-1.5V12a1.5 1.5 0 0 1 1.5-1.5h3z"/>
                        </svg>
                        <span className="text-sm">Codeforces</span>
                      </a>
                    )}
                    
                    {problem.links.article && (
                      <a
                        href={problem.links.article}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-1 text-green-600 hover:text-green-700 link-icon"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                        </svg>
                        <span className="text-sm">Article</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TopicDetail;
