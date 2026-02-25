// TaskFlow Pro - Advanced Task Management Application
class TaskFlowApp {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem('taskflow_tasks')) || [];
        this.projects = JSON.parse(localStorage.getItem('taskflow_projects')) || [];
        this.currentView = 'dashboard';
        this.currentFilter = 'all';
        this.currentPriorityFilter = 'all';
        this.searchQuery = '';
        this.sortBy = 'created';
        this.currentDate = new Date();
        this.editingTask = null;
        this.editingProject = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupTheme();
        this.renderCurrentView();
        this.updateStats();
        this.initializeCharts();
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.switchView(e.currentTarget.dataset.view);
            });
        });

        // Theme toggle
        document.getElementById('themeToggle').addEventListener('change', (e) => {
            this.toggleTheme(e.target.checked);
        });

        // Task management
        document.getElementById('addTaskBtn').addEventListener('click', () => this.openTaskModal());
        document.getElementById('quickAddBtn').addEventListener('click', () => this.openTaskModal());
        document.getElementById('taskForm').addEventListener('submit', (e) => this.saveTask(e));
        document.getElementById('closeModal').addEventListener('click', () => this.closeTaskModal());
        document.getElementById('cancelTask').addEventListener('click', () => this.closeTaskModal());

        // Project management
        document.getElementById('addProjectBtn').addEventListener('click', () => this.openProjectModal());
        document.getElementById('projectForm').addEventListener('submit', (e) => this.saveProject(e));
        document.getElementById('closeProjectModal').addEventListener('click', () => this.closeProjectModal());
        document.getElementById('cancelProject').addEventListener('click', () => this.closeProjectModal());

        // Search and filters
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.renderTasksList();
        });

        document.getElementById('sortSelect').addEventListener('change', (e) => {
            this.sortBy = e.target.value;
            this.renderTasksList();
        });

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setFilter(e.target.dataset.filter);
            });
        });

        document.querySelectorAll('.priority-filter').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setPriorityFilter(e.target.dataset.priority);
            });
        });

        // Calendar navigation
        document.getElementById('prevMonth').addEventListener('click', () => this.navigateMonth(-1));
        document.getElementById('nextMonth').addEventListener('click', () => this.navigateMonth(1));

        // Analytics timeframe
        document.getElementById('analyticsTimeframe').addEventListener('change', () => {
            this.updateAnalytics();
        });

        // Modal close on backdrop click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
    }

    setupTheme() {
        const savedTheme = localStorage.getItem('taskflow_theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        document.getElementById('themeToggle').checked = savedTheme === 'dark';
    }

    toggleTheme(isDark) {
        const theme = isDark ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('taskflow_theme', theme);
    }

    switchView(viewName) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-view="${viewName}"]`).classList.add('active');

        // Update views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });
        document.getElementById(`${viewName}-view`).classList.add('active');

        this.currentView = viewName;
        this.renderCurrentView();
    }

    renderCurrentView() {
        switch (this.currentView) {
            case 'dashboard':
                this.renderDashboard();
                break;
            case 'tasks':
                this.renderTasksList();
                break;
            case 'projects':
                this.renderProjects();
                break;
            case 'calendar':
                this.renderCalendar();
                break;
            case 'analytics':
                this.renderAnalytics();
                break;
        }
    }

    // Task Management
    openTaskModal(task = null) {
        this.editingTask = task;
        const modal = document.getElementById('taskModal');
        const form = document.getElementById('taskForm');
        
        if (task) {
            document.getElementById('modalTitle').textContent = 'Edit Task';
            document.getElementById('taskTitle').value = task.title;
            document.getElementById('taskDescription').value = task.description || '';
            document.getElementById('taskPriority').value = task.priority;
            document.getElementById('taskProject').value = task.projectId || '';
            document.getElementById('taskDueDate').value = task.dueDate || '';
            document.getElementById('taskEstimate').value = task.estimate || '';
            document.getElementById('taskTags').value = task.tags ? task.tags.join(', ') : '';
        } else {
            document.getElementById('modalTitle').textContent = 'Add New Task';
            form.reset();
        }

        this.populateProjectSelect();
        modal.classList.add('active');
        document.getElementById('taskTitle').focus();
    }

    closeTaskModal() {
        document.getElementById('taskModal').classList.remove('active');
        this.editingTask = null;
    }

    saveTask(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const taskData = {
            title: document.getElementById('taskTitle').value.trim(),
            description: document.getElementById('taskDescription').value.trim(),
            priority: document.getElementById('taskPriority').value,
            projectId: document.getElementById('taskProject').value || null,
            dueDate: document.getElementById('taskDueDate').value || null,
            estimate: parseFloat(document.getElementById('taskEstimate').value) || null,
            tags: document.getElementById('taskTags').value.split(',').map(tag => tag.trim()).filter(tag => tag)
        };

        if (!taskData.title) {
            this.showNotification('Task title is required', 'error');
            return;
        }

        if (this.editingTask) {
            // Update existing task
            const taskIndex = this.tasks.findIndex(t => t.id === this.editingTask.id);
            this.tasks[taskIndex] = { ...this.editingTask, ...taskData, updatedAt: new Date().toISOString() };
            this.showNotification('Task updated successfully', 'success');
        } else {
            // Create new task
            const newTask = {
                id: Date.now(),
                ...taskData,
                completed: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            this.tasks.unshift(newTask);
            this.showNotification('Task created successfully', 'success');
        }

        this.saveTasks();
        this.closeTaskModal();
        this.renderCurrentView();
        this.updateStats();
    }

    toggleTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            task.updatedAt = new Date().toISOString();
            if (task.completed) {
                task.completedAt = new Date().toISOString();
            } else {
                delete task.completedAt;
            }
            this.saveTasks();
            this.renderCurrentView();
            this.updateStats();
            this.showNotification(
                task.completed ? 'Task completed!' : 'Task marked as pending',
                'success'
            );
        }
    }

    deleteTask(taskId) {
        if (confirm('Are you sure you want to delete this task?')) {
            this.tasks = this.tasks.filter(t => t.id !== taskId);
            this.saveTasks();
            this.renderCurrentView();
            this.updateStats();
            this.showNotification('Task deleted', 'info');
        }
    }

    // Project Management
    openProjectModal(project = null) {
        this.editingProject = project;
        const modal = document.getElementById('projectModal');
        const form = document.getElementById('projectForm');
        
        if (project) {
            document.getElementById('projectModalTitle').textContent = 'Edit Project';
            document.getElementById('projectName').value = project.name;
            document.getElementById('projectDescription').value = project.description || '';
            document.getElementById('projectColor').value = project.color;
            document.getElementById('projectDeadline').value = project.deadline || '';
        } else {
            document.getElementById('projectModalTitle').textContent = 'Create New Project';
            form.reset();
            document.getElementById('projectColor').value = '#667eea';
        }

        modal.classList.add('active');
        document.getElementById('projectName').focus();
    }

    closeProjectModal() {
        document.getElementById('projectModal').classList.remove('active');
        this.editingProject = null;
    }

    saveProject(e) {
        e.preventDefault();
        
        const projectData = {
            name: document.getElementById('projectName').value.trim(),
            description: document.getElementById('projectDescription').value.trim(),
            color: document.getElementById('projectColor').value,
            deadline: document.getElementById('projectDeadline').value || null
        };

        if (!projectData.name) {
            this.showNotification('Project name is required', 'error');
            return;
        }

        if (this.editingProject) {
            // Update existing project
            const projectIndex = this.projects.findIndex(p => p.id === this.editingProject.id);
            this.projects[projectIndex] = { ...this.editingProject, ...projectData, updatedAt: new Date().toISOString() };
            this.showNotification('Project updated successfully', 'success');
        } else {
            // Create new project
            const newProject = {
                id: Date.now(),
                ...projectData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            this.projects.push(newProject);
            this.showNotification('Project created successfully', 'success');
        }

        this.saveProjects();
        this.closeProjectModal();
        this.renderCurrentView();
    }

    deleteProject(projectId) {
        if (confirm('Are you sure you want to delete this project? All associated tasks will be unassigned.')) {
            this.projects = this.projects.filter(p => p.id !== projectId);
            // Unassign tasks from deleted project
            this.tasks.forEach(task => {
                if (task.projectId === projectId) {
                    task.projectId = null;
                }
            });
            this.saveProjects();
            this.saveTasks();
            this.renderCurrentView();
            this.showNotification('Project deleted', 'info');
        }
    }

    // Filtering and Sorting
    setFilter(filter) {
        this.currentFilter = filter;
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
        this.renderTasksList();
    }

    setPriorityFilter(priority) {
        this.currentPriorityFilter = priority;
        document.querySelectorAll('.priority-filter').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-priority="${priority}"]`).classList.add('active');
        this.renderTasksList();
    }

    getFilteredTasks() {
        let filtered = [...this.tasks];

        // Apply status filter
        if (this.currentFilter === 'completed') {
            filtered = filtered.filter(task => task.completed);
        } else if (this.currentFilter === 'pending') {
            filtered = filtered.filter(task => !task.completed);
        } else if (this.currentFilter === 'overdue') {
            filtered = filtered.filter(task => this.isTaskOverdue(task));
        }

        // Apply priority filter
        if (this.currentPriorityFilter !== 'all') {
            filtered = filtered.filter(task => task.priority === this.currentPriorityFilter);
        }

        // Apply search filter
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(task => 
                task.title.toLowerCase().includes(query) ||
                (task.description && task.description.toLowerCase().includes(query)) ||
                (task.tags && task.tags.some(tag => tag.toLowerCase().includes(query)))
            );
        }

        // Apply sorting
        filtered.sort((a, b) => {
            switch (this.sortBy) {
                case 'priority':
                    const priorityOrder = { high: 3, medium: 2, low: 1 };
                    return priorityOrder[b.priority] - priorityOrder[a.priority];
                case 'dueDate':
                    if (!a.dueDate && !b.dueDate) return 0;
                    if (!a.dueDate) return 1;
                    if (!b.dueDate) return -1;
                    return new Date(a.dueDate) - new Date(b.dueDate);
                case 'alphabetical':
                    return a.title.localeCompare(b.title);
                default: // created
                    return new Date(b.createdAt) - new Date(a.createdAt);
            }
        });

        return filtered;
    }

    // Rendering Methods
    renderDashboard() {
        this.updateStats();
        this.renderRecentTasks();
        this.updateProductivityChart();
    }

    renderTasksList() {
        const tasksList = document.getElementById('tasksList');
        const filteredTasks = this.getFilteredTasks();

        if (filteredTasks.length === 0) {
            tasksList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-tasks"></i>
                    <h3>No tasks found</h3>
                    <p>Try adjusting your filters or create a new task</p>
                </div>
            `;
            return;
        }

        tasksList.innerHTML = filteredTasks.map(task => this.renderTaskItem(task)).join('');
    }

    renderTaskItem(task) {
        const project = task.projectId ? this.projects.find(p => p.id === task.projectId) : null;
        const isOverdue = this.isTaskOverdue(task);
        
        return `
            <div class="task-item ${task.completed ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}">
                <input 
                    type="checkbox" 
                    class="task-checkbox" 
                    ${task.completed ? 'checked' : ''}
                    onchange="app.toggleTask(${task.id})"
                >
                <div class="task-content">
                    <div class="task-title">${this.escapeHtml(task.title)}</div>
                    <div class="task-meta">
                        <span class="task-priority ${task.priority}">${task.priority.toUpperCase()}</span>
                        ${project ? `<span class="task-project" style="color: ${project.color}">${project.name}</span>` : ''}
                        ${task.dueDate ? `<span class="task-due-date"><i class="fas fa-calendar"></i> ${this.formatDate(task.dueDate)}</span>` : ''}
                        ${task.estimate ? `<span class="task-estimate"><i class="fas fa-clock"></i> ${task.estimate}h</span>` : ''}
                        ${task.tags && task.tags.length > 0 ? `<span class="task-tags">${task.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</span>` : ''}
                    </div>
                </div>
                <div class="task-actions">
                    <button onclick="app.openTaskModal(app.tasks.find(t => t.id === ${task.id}))" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="app.deleteTask(${task.id})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }

    renderProjects() {
        const projectsGrid = document.getElementById('projectsGrid');
        
        if (this.projects.length === 0) {
            projectsGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-folder-open"></i>
                    <h3>No projects yet</h3>
                    <p>Create your first project to organize your tasks</p>
                </div>
            `;
            return;
        }

        projectsGrid.innerHTML = this.projects.map(project => {
            const projectTasks = this.tasks.filter(task => task.projectId === project.id);
            const completedTasks = projectTasks.filter(task => task.completed).length;
            const progress = projectTasks.length > 0 ? (completedTasks / projectTasks.length) * 100 : 0;

            return `
                <div class="project-card">
                    <div class="project-header" style="border-left-color: ${project.color}">
                        <div class="project-name">${this.escapeHtml(project.name)}</div>
                        <div class="project-description">${this.escapeHtml(project.description || '')}</div>
                    </div>
                    <div class="project-stats">
                        <span>${projectTasks.length} tasks</span>
                        <span>${Math.round(progress)}% complete</span>
                        <div class="project-actions">
                            <button onclick="app.openProjectModal(app.projects.find(p => p.id === ${project.id}))" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="app.deleteProject(${project.id})" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderCalendar() {
        const calendarGrid = document.getElementById('calendarGrid');
        const currentMonth = document.getElementById('currentMonth');
        
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        currentMonth.textContent = new Date(year, month).toLocaleDateString('en-US', { 
            month: 'long', 
            year: 'numeric' 
        });

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        const days = [];
        const current = new Date(startDate);
        
        // Generate calendar days
        for (let i = 0; i < 42; i++) {
            const dayTasks = this.tasks.filter(task => 
                task.dueDate && new Date(task.dueDate).toDateString() === current.toDateString()
            );
            
            days.push({
                date: new Date(current),
                isCurrentMonth: current.getMonth() === month,
                isToday: current.toDateString() === new Date().toDateString(),
                tasks: dayTasks
            });
            
            current.setDate(current.getDate() + 1);
        }

        calendarGrid.innerHTML = `
            <div class="calendar-header">
                ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => 
                    `<div class="calendar-day-header">${day}</div>`
                ).join('')}
            </div>
            ${days.map(day => `
                <div class="calendar-day ${day.isCurrentMonth ? '' : 'other-month'} ${day.isToday ? 'today' : ''}">
                    <span class="day-number">${day.date.getDate()}</span>
                    ${day.tasks.length > 0 ? `<div class="day-tasks">${day.tasks.length} task${day.tasks.length > 1 ? 's' : ''}</div>` : ''}
                </div>
            `).join('')}
        `;
    }

    renderAnalytics() {
        this.updateAnalytics();
    }

    renderRecentTasks() {
        const recentTasksList = document.getElementById('recentTasksList');
        const recentTasks = this.tasks
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
            .slice(0, 5);

        if (recentTasks.length === 0) {
            recentTasksList.innerHTML = '<p class="empty-state">No recent tasks</p>';
            return;
        }

        recentTasksList.innerHTML = recentTasks.map(task => `
            <div class="recent-task-item">
                <div class="task-title">${this.escapeHtml(task.title)}</div>
                <div class="task-status ${task.completed ? 'completed' : 'pending'}">
                    ${task.completed ? 'Completed' : 'Pending'}
                </div>
            </div>
        `).join('');
    }

    // Statistics and Analytics
    updateStats() {
        const totalTasks = this.tasks.length;
        const completedTasks = this.tasks.filter(task => task.completed).length;
        const pendingTasks = totalTasks - completedTasks;
        const overdueTasks = this.tasks.filter(task => this.isTaskOverdue(task)).length;

        document.getElementById('totalTasksCount').textContent = totalTasks;
        document.getElementById('completedTasksCount').textContent = completedTasks;
        document.getElementById('pendingTasksCount').textContent = pendingTasks;
        document.getElementById('overdueTasksCount').textContent = overdueTasks;
    }

    initializeCharts() {
        // Initialize Chart.js charts
        this.productivityChart = null;
        this.completionChart = null;
        this.priorityChart = null;
        this.projectChart = null;
    }

    updateProductivityChart() {
        const ctx = document.getElementById('productivityChart');
        if (!ctx) return;

        // Generate last 7 days data
        const last7Days = [];
        const today = new Date();
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            
            const dayTasks = this.tasks.filter(task => {
                const taskDate = new Date(task.completedAt || task.createdAt);
                return taskDate.toDateString() === date.toDateString() && task.completed;
            });
            
            last7Days.push({
                date: date.toLocaleDateString('en-US', { weekday: 'short' }),
                completed: dayTasks.length
            });
        }

        if (this.productivityChart) {
            this.productivityChart.destroy();
        }

        this.productivityChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: last7Days.map(d => d.date),
                datasets: [{
                    label: 'Completed Tasks',
                    data: last7Days.map(d => d.completed),
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    updateAnalytics() {
        // Update completion trend chart
        this.updateCompletionChart();
        this.updatePriorityChart();
        this.updateProjectChart();
        this.updateInsights();
    }

    updateCompletionChart() {
        const ctx = document.getElementById('completionChart');
        if (!ctx) return;

        // Implementation for completion trend chart
        // Similar to productivity chart but with different data
    }

    updatePriorityChart() {
        const ctx = document.getElementById('priorityChart');
        if (!ctx) return;

        const priorities = { high: 0, medium: 0, low: 0 };
        this.tasks.forEach(task => {
            if (!task.completed) {
                priorities[task.priority]++;
            }
        });

        if (this.priorityChart) {
            this.priorityChart.destroy();
        }

        this.priorityChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['High', 'Medium', 'Low'],
                datasets: [{
                    data: [priorities.high, priorities.medium, priorities.low],
                    backgroundColor: ['#dc3545', '#ffc107', '#28a745']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    updateProjectChart() {
        // Implementation for project progress chart
    }

    updateInsights() {
        const insightsList = document.getElementById('insightsList');
        if (!insightsList) return;

        const insights = this.generateInsights();
        insightsList.innerHTML = insights.map(insight => `
            <div class="insight-item">
                <i class="fas ${insight.icon}"></i>
                <span>${insight.text}</span>
            </div>
        `).join('');
    }

    generateInsights() {
        const insights = [];
        const completionRate = this.tasks.length > 0 ? 
            (this.tasks.filter(t => t.completed).length / this.tasks.length * 100).toFixed(1) : 0;
        
        insights.push({
            icon: 'fa-chart-line',
            text: `Your overall completion rate is ${completionRate}%`
        });

        const overdueTasks = this.tasks.filter(t => this.isTaskOverdue(t)).length;
        if (overdueTasks > 0) {
            insights.push({
                icon: 'fa-exclamation-triangle',
                text: `You have ${overdueTasks} overdue task${overdueTasks > 1 ? 's' : ''}`
            });
        }

        const highPriorityTasks = this.tasks.filter(t => t.priority === 'high' && !t.completed).length;
        if (highPriorityTasks > 0) {
            insights.push({
                icon: 'fa-fire',
                text: `${highPriorityTasks} high priority task${highPriorityTasks > 1 ? 's' : ''} need${highPriorityTasks === 1 ? 's' : ''} attention`
            });
        }

        return insights;
    }

    // Utility Methods
    navigateMonth(direction) {
        this.currentDate.setMonth(this.currentDate.getMonth() + direction);
        this.renderCalendar();
    }

    populateProjectSelect() {
        const select = document.getElementById('taskProject');
        select.innerHTML = '<option value="">No Project</option>';
        
        this.projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = project.name;
            select.appendChild(option);
        });
    }

    isTaskOverdue(task) {
        if (!task.dueDate || task.completed) return false;
        return new Date(task.dueDate) < new Date();
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notifications');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        container.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => {
                container.removeChild(notification);
            }, 300);
        }, 3000);
    }

    // Data Persistence
    saveTasks() {
        localStorage.setItem('taskflow_tasks', JSON.stringify(this.tasks));
    }

    saveProjects() {
        localStorage.setItem('taskflow_projects', JSON.stringify(this.projects));
    }

    // Export/Import functionality
    exportData() {
        const data = {
            tasks: this.tasks,
            projects: this.projects,
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `taskflow-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    importData(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.tasks && data.projects) {
                    this.tasks = data.tasks;
                    this.projects = data.projects;
                    this.saveTasks();
                    this.saveProjects();
                    this.renderCurrentView();
                    this.updateStats();
                    this.showNotification('Data imported successfully', 'success');
                }
            } catch (error) {
                this.showNotification('Invalid file format', 'error');
            }
        };
        reader.readAsText(file);
    }
}

// Initialize the application
const app = new TaskFlowApp();

// Add CSS animation for slideOut
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);