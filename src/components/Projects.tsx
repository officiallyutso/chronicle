import React, { useState, useEffect } from 'react';
import { AgentApiService } from '../services/agentApiService';

interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  status?: 'active' | 'completed' | 'archived';
  fileCount?: number;
  lastActivity?: number;
}

interface ProjectDetails {
  id: string;
  name: string;
  projectSummary: string;
  fileSummaries: string[];
  folderSummaries: Record<string, string>;
  createdAt: number;
  workspacePath?: string;
}

export const Projects: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectDetails | null>(null);
  const [generatedReadme, setGeneratedReadme] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'activity'>('date');
  const agentApiService = new AgentApiService();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
        const response = await fetch('http://localhost:3001/api/projects');
        const projectsData = await response.json();
        
        // Enhance projects with additional metadata
        const enhancedProjects = projectsData.map((project: any) => ({
        ...project,
        status: getProjectStatus(project),
        fileCount: 0, // We'll fetch this from individual project details
        lastActivity: project.updatedAt || project.createdAt
        }));
        
        // Fetch file counts for each project
        const projectsWithCounts = await Promise.all(
        enhancedProjects.map(async (project: { id: any; }) => {
            try {
            const detailResponse = await fetch(`http://localhost:3001/api/projects/${project.id}`);
            if (detailResponse.ok) {
                const details = await detailResponse.json();
                return {
                ...project,
                fileCount: details.fileSummaries?.length || 0,
                folderCount: Object.keys(details.folderSummaries || {}).length
                };
            }
            } catch (error) {
            console.error(`Failed to fetch details for project ${project.id}:`, error);
            }
            return project;
        })
        );
        
        setProjects(projectsWithCounts);
    } catch (error) {
        console.error('Failed to load projects:', error);
    } finally {
        setLoading(false);
    }
    };

  const getProjectStatus = (project: any): 'active' | 'completed' | 'archived' => {
    const daysSinceUpdate = (Date.now() - (project.updatedAt || project.createdAt)) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate < 7) return 'active';
    if (daysSinceUpdate < 30) return 'completed';
    return 'archived';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'completed': return 'bg-blue-500';
      case 'archived': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return '🟢';
      case 'completed': return '🔵';
      case 'archived': return '⚫';
      default: return '⚫';
    }
  };

  const loadProjectDetails = async (projectId: string) => {
  try {
    console.log('Loading project details for:', projectId);
    const response = await fetch(`http://localhost:3001/api/projects/${projectId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const projectData = await response.json();
    console.log('Project data received:', projectData);
    
    // Ensure the data structure is correct
    if (!projectData || !projectData.id) {
      throw new Error('Invalid project data structure');
    }
    
    // Make sure fileSummaries is an array
    if (!Array.isArray(projectData.fileSummaries)) {
      projectData.fileSummaries = [];
    }
    
    // Make sure folderSummaries is an object
    if (!projectData.folderSummaries || typeof projectData.folderSummaries !== 'object') {
      projectData.folderSummaries = {};
    }
    
    setSelectedProject(projectData);
    setGeneratedReadme('');
  } catch (error) {
    console.error('Failed to load project details:', error);
    setSelectedProject({
      id: projectId,
      name: 'Error Loading Project',
      projectSummary: 'Failed to load project details. Please try again.',
      fileSummaries: [],
      folderSummaries: {},
      createdAt: Date.now()
    });
  }
};

  const generateReadme = async () => {
    if (!selectedProject) return;
    
    setIsGenerating(true);
    try {
      const response = await fetch(`http://localhost:3001/api/projects/${selectedProject.id}/readme`, {
        method: 'POST'
      });
      const data = await response.json();
      setGeneratedReadme(data.readme);
    } catch (error) {
      console.error('Failed to generate README:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Add toast notification here if you have one
  };

  const downloadReadme = () => {
    const blob = new Blob([generatedReadme], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedProject?.name || 'project'}-README.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredProjects = projects
    .filter(project => 
      project.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.name.localeCompare(b.name);
        case 'date': return b.createdAt - a.createdAt;
        case 'activity': return (b.lastActivity || 0) - (a.lastActivity || 0);
        default: return 0;
      }
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <div className="ml-4 text-gray-400">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!selectedProject ? (
        <div>
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Project Gallery</h2>
              <p className="text-gray-400">
                Projects analyzed by your VS Code extension • {projects.length} total
              </p>
            </div>
            
            {/* Extension Status Indicator */}
            <div className="mt-4 sm:mt-0 flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-gray-800 px-4 py-2 rounded-lg">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-300">Extension Active</span>
              </div>
              <div className="text-sm text-gray-400">
                Last sync: {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>

          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'date' | 'activity')}
              className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="date">Sort by Date</option>
              <option value="name">Sort by Name</option>
              <option value="activity">Sort by Activity</option>
            </select>
          </div>

          {/* Projects Grid */}
          {filteredProjects.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📁</div>
              <div className="text-xl text-gray-400 mb-2">
                {searchTerm ? 'No projects match your search' : 'No projects found'}
              </div>
              <div className="text-sm text-gray-500 mb-6">
                {searchTerm 
                  ? 'Try adjusting your search terms'
                  : 'Use the VS Code extension to summarize a project and it will appear here'
                }
              </div>
              {!searchTerm && (
                <div className="bg-gray-800 rounded-lg p-6 max-w-md mx-auto">
                  <h3 className="text-lg font-semibold text-white mb-2">Getting Started</h3>
                  <ol className="text-sm text-gray-300 text-left space-y-1">
                    <li>1. Open VS Code in your project</li>
                    <li>2. Press <kbd className="bg-gray-700 px-2 py-1 rounded">Ctrl+Shift+P</kbd></li>
                    <li>3. Run "Chronicle: Summarize Project"</li>
                    <li>4. Your project will appear here!</li>
                  </ol>
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredProjects.map((project) => (
                <div
                    key={project.id}
                    onClick={() => loadProjectDetails(project.id)}
                    className="group bg-gray-800 rounded-xl p-6 cursor-pointer hover:bg-gray-750 transition-all duration-200 hover:scale-105 hover:shadow-xl border border-gray-700 hover:border-gray-600"
                >
                    {/* Project Header */}
                    <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-blue-400 transition-colors">
                        {project.name}
                        </h3>
                        <div className="flex items-center space-x-2">
                        <span className="text-xs">{getStatusIcon(project.status || 'archived')}</span>
                        <span className="text-xs text-gray-400 capitalize">
                            {project.status || 'archived'}
                        </span>
                        </div>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(project.status || 'archived')}`}></div>
                    </div>

                    {/* Project Stats - FIXED */}
                    <div className="grid grid-cols-1 gap-4 mb-4">
                    <div className="bg-gray-900 rounded-lg p-3">
                        <div className="text-2xl font-bold text-blue-400">{project.fileCount || 0}</div>
                        <div className="text-xs text-gray-400">Files Analyzed</div>
                    </div>
                    </div>

                    {/* Project Info */}
                    <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-gray-400">
                        <span>Created:</span>
                        <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                        <span>Last Activity:</span>
                        <span>{new Date(project.lastActivity || project.createdAt).toLocaleDateString()}</span>
                    </div>
                    </div>

                    {/* Hover Effect */}
                    <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="text-xs text-blue-400 flex items-center">
                        Click to view details
                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                    </div>
                </div>
                ))}

            </div>
          )}
        </div>
      ) : (
        <div>
          {/* Project Detail Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSelectedProject(null)}
                className="flex items-center text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Projects
              </button>
              <div className="h-6 w-px bg-gray-600"></div>
              <h2 className="text-3xl font-bold text-white">{selectedProject.name}</h2>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="text-sm text-gray-400">
                {selectedProject.fileSummaries.length} files • {Object.keys(selectedProject.folderSummaries).length} folders
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {/* Project Overview Card */}
            <div className="bg-gradient-to-r from-gray-800 to-gray-750 rounded-xl p-8 border border-gray-700">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white">Project Overview</h3>
              </div>
              <div className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                {selectedProject.projectSummary}
              </div>
            </div>

            {/* Folder Structure */}
            {Object.keys(selectedProject.folderSummaries).length > 0 && (
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  Folder Structure
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {Object.entries(selectedProject.folderSummaries).map(([folder, summary]) => (
                    <div key={folder} className="bg-gray-900 rounded-lg p-4 border-l-4 border-blue-500">
                      <h4 className="font-medium text-white mb-2 flex items-center">
                        <span className="text-blue-400 mr-2">📁</span>
                        {folder}
                      </h4>
                      <p className="text-gray-300 text-sm leading-relaxed">{summary}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* File Summaries */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                File Analysis ({selectedProject.fileSummaries.length} files)
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                {selectedProject.fileSummaries.map((summary, index) => (
                  <div key={index} className="bg-gray-900 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors">
                    <div className="text-gray-300 text-sm leading-relaxed">
                      <div dangerouslySetInnerHTML={{ 
                        __html: summary
                          .replace(/###\s*([^\n]+)/g, '<strong class="text-white text-base">📄 $1</strong>')
                          .replace(/\n\n/g, '<br/><br/>')
                          .replace(/\n/g, '<br/>')
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* README Generation */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Generate README
                </h3>
                <button
                  onClick={generateReadme}
                  disabled={isGenerating}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors flex items-center space-x-2"
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>Generate README</span>
                    </>
                  )}
                </button>
              </div>

              {generatedReadme && (
                <div className="space-y-4">
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => copyToClipboard(generatedReadme)}
                      className="text-sm bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>Copy</span>
                    </button>
                    <button
                      onClick={downloadReadme}
                      className="text-sm bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Download</span>
                    </button>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-6 max-h-96 overflow-y-auto custom-scrollbar">
                    <pre className="text-gray-300 text-sm whitespace-pre-wrap font-mono">
                      {generatedReadme}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
