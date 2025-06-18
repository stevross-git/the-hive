/**
 * AI Registry Monitoring & Analytics
 * Comprehensive monitoring, logging, and analytics for the AI registry
 */

const fs = require('fs').promises;
const path = require('path');
const { EventEmitter } = require('events');

class RegistryMonitor extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.logDir = options.logDir || './logs';
        this.metricsFile = path.join(this.logDir, 'metrics.json');
        this.accessLogFile = path.join(this.logDir, 'access.log');
        this.errorLogFile = path.join(this.logDir, 'errors.log');
        
        this.metrics = {
            requests: {
                total: 0,
                successful: 0,
                failed: 0,
                byEndpoint: {},
                byModel: {},
                byAgent: {},
                responseTimeHistory: []
            },
            models: {
                totalRegistered: 0,
                activeCount: 0,
                byProvider: {},
                byType: {},
                usageCount: {},
                healthStatus: {}
            },
            agents: {
                totalRegistered: 0,
                activeCount: 0,
                byType: {},
                lastSeenHistory: {}
            },
            system: {
                uptime: Date.now(),
                memoryUsage: [],
                cpuUsage: [],
                errorRate: 0,
                averageResponseTime: 0
            }
        };

        this.init();
    }

    async init() {
        // Create logs directory
        try {
            await fs.mkdir(this.logDir, { recursive: true });
        } catch (error) {
            console.error('Failed to create logs directory:', error);
        }

        // Load existing metrics
        await this.loadMetrics();

        // Start periodic tasks
        this.startPeriodicTasks();

        console.log('📊 Registry monitoring initialized');
    }

    /**
     * Load existing metrics from file
     */
    async loadMetrics() {
        try {
            const data = await fs.readFile(this.metricsFile, 'utf8');
            const savedMetrics = JSON.parse(data);
            
            // Merge saved metrics with defaults
            this.metrics = { ...this.metrics, ...savedMetrics };
            
            console.log('📈 Loaded existing metrics');
        } catch (error) {
            console.log('📊 Starting with fresh metrics');
        }
    }

    /**
     * Save metrics to file
     */
    async saveMetrics() {
        try {
            await fs.writeFile(this.metricsFile, JSON.stringify(this.metrics, null, 2));
        } catch (error) {
            console.error('Failed to save metrics:', error);
        }
    }

    /**
     * Start periodic monitoring tasks
     */
    startPeriodicTasks() {
        // Save metrics every 30 seconds
        setInterval(() => this.saveMetrics(), 30000);

        // Collect system metrics every minute
        setInterval(() => this.collectSystemMetrics(), 60000);

        // Clean old data every hour
        setInterval(() => this.cleanOldData(), 3600000);
    }

    /**
     * Log API request
     */
    logRequest(req, res, responseTime) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            method: req.method,
            url: req.url,
            userAgent: req.get('User-Agent'),
            ip: req.ip || req.connection.remoteAddress,
            statusCode: res.statusCode,
            responseTime: responseTime,
            contentLength: res.get('Content-Length') || 0
        };

        // Update metrics
        this.metrics.requests.total++;
        
        if (res.statusCode >= 200 && res.statusCode < 400) {
            this.metrics.requests.successful++;
        } else {
            this.metrics.requests.failed++;
        }

        // Track by endpoint
        const endpoint = this.normalizeEndpoint(req.url);
        if (!this.metrics.requests.byEndpoint[endpoint]) {
            this.metrics.requests.byEndpoint[endpoint] = {
                count: 0,
                totalResponseTime: 0,
                errors: 0
            };
        }
        
        this.metrics.requests.byEndpoint[endpoint].count++;
        this.metrics.requests.byEndpoint[endpoint].totalResponseTime += responseTime;
        
        if (res.statusCode >= 400) {
            this.metrics.requests.byEndpoint[endpoint].errors++;
        }

        // Track response times (keep last 1000)
        this.metrics.requests.responseTimeHistory.push({
            timestamp: Date.now(),
            responseTime: responseTime
        });
        
        if (this.metrics.requests.responseTimeHistory.length > 1000) {
            this.metrics.requests.responseTimeHistory.shift();
        }

        // Update average response time
        this.updateAverageResponseTime();

        // Write to access log
        this.writeAccessLog(logEntry);

        // Emit event
        this.emit('request', logEntry);
    }

    /**
     * Log error
     */
    logError(error, context = {}) {
        const errorEntry = {
            timestamp: new Date().toISOString(),
            error: {
                message: error.message,
                stack: error.stack,
                name: error.name
            },
            context: context
        };

        // Write to error log
        this.writeErrorLog(errorEntry);

        // Update error rate
        this.updateErrorRate();

        // Emit event
        this.emit('error', errorEntry);
    }

    /**
     * Log model usage
     */
    logModelUsage(modelId, operation, success = true, responseTime = 0) {
        if (!this.metrics.models.usageCount[modelId]) {
            this.metrics.models.usageCount[modelId] = {
                requests: 0,
                successfulRequests: 0,
                failedRequests: 0,
                totalResponseTime: 0,
                operations: {}
            };
        }

        const usage = this.metrics.models.usageCount[modelId];
        usage.requests++;
        usage.totalResponseTime += responseTime;

        if (success) {
            usage.successfulRequests++;
        } else {
            usage.failedRequests++;
        }

        // Track by operation type
        if (!usage.operations[operation]) {
            usage.operations[operation] = { count: 0, successRate: 0 };
        }
        usage.operations[operation].count++;

        // Update success rate
        usage.operations[operation].successRate = 
            usage.successfulRequests / usage.requests;

        this.emit('model_usage', { modelId, operation, success, responseTime });
    }

    /**
     * Log agent activity
     */
    logAgentActivity(agentId, activity, metadata = {}) {
        const activityEntry = {
            timestamp: new Date().toISOString(),
            agentId: agentId,
            activity: activity,
            metadata: metadata
        };

        // Track last seen
        if (!this.metrics.agents.lastSeenHistory[agentId]) {
            this.metrics.agents.lastSeenHistory[agentId] = [];
        }
        
        this.metrics.agents.lastSeenHistory[agentId].push(Date.now());
        
        // Keep only last 100 entries per agent
        if (this.metrics.agents.lastSeenHistory[agentId].length > 100) {
            this.metrics.agents.lastSeenHistory[agentId].shift();
        }

        this.emit('agent_activity', activityEntry);
    }

    /**
     * Update model registration metrics
     */
    updateModelMetrics(models) {
        this.metrics.models.totalRegistered = models.length;
        this.metrics.models.activeCount = models.filter(m => m.status === 'active').length;

        // Reset provider and type counts
        this.metrics.models.byProvider = {};
        this.metrics.models.byType = {};

        models.forEach(model => {
            // Count by provider
            if (!this.metrics.models.byProvider[model.provider]) {
                this.metrics.models.byProvider[model.provider] = 0;
            }
            this.metrics.models.byProvider[model.provider]++;

            // Count by type
            if (!this.metrics.models.byType[model.type]) {
                this.metrics.models.byType[model.type] = 0;
            }
            this.metrics.models.byType[model.type]++;
        });
    }

    /**
     * Update agent metrics
     */
    updateAgentMetrics(agents) {
        this.metrics.agents.totalRegistered = agents.length;
        this.metrics.agents.activeCount = agents.filter(a => a.status === 'online').length;

        // Reset type counts
        this.metrics.agents.byType = {};

        agents.forEach(agent => {
            if (!this.metrics.agents.byType[agent.type]) {
                this.metrics.agents.byType[agent.type] = 0;
            }
            this.metrics.agents.byType[agent.type]++;
        });
    }

    /**
     * Collect system metrics
     */
    collectSystemMetrics() {
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();

        // Memory metrics
        this.metrics.system.memoryUsage.push({
            timestamp: Date.now(),
            rss: memUsage.rss,
            heapTotal: memUsage.heapTotal,
            heapUsed: memUsage.heapUsed,
            external: memUsage.external
        });

        // CPU metrics
        this.metrics.system.cpuUsage.push({
            timestamp: Date.now(),
            user: cpuUsage.user,
            system: cpuUsage.system
        });

        // Keep only last 24 hours of data (1440 minutes)
        const cutoff = Date.now() - (24 * 60 * 60 * 1000);
        
        this.metrics.system.memoryUsage = this.metrics.system.memoryUsage
            .filter(entry => entry.timestamp > cutoff);
            
        this.metrics.system.cpuUsage = this.metrics.system.cpuUsage
            .filter(entry => entry.timestamp > cutoff);
    }

    /**
     * Update average response time
     */
    updateAverageResponseTime() {
        if (this.metrics.requests.responseTimeHistory.length === 0) return;

        const sum = this.metrics.requests.responseTimeHistory
            .reduce((acc, entry) => acc + entry.responseTime, 0);
            
        this.metrics.system.averageResponseTime = 
            sum / this.metrics.requests.responseTimeHistory.length;
    }

    /**
     * Update error rate
     */
    updateErrorRate() {
        if (this.metrics.requests.total === 0) return;
        
        this.metrics.system.errorRate = 
            this.metrics.requests.failed / this.metrics.requests.total;
    }

    /**
     * Get performance analytics
     */
    getPerformanceAnalytics() {
        const now = Date.now();
        const oneHourAgo = now - (60 * 60 * 1000);
        const oneDayAgo = now - (24 * 60 * 60 * 1000);

        // Recent requests (last hour)
        const recentRequests = this.metrics.requests.responseTimeHistory
            .filter(entry => entry.timestamp > oneHourAgo);

        // Calculate percentiles
        const responseTimes = recentRequests
            .map(entry => entry.responseTime)
            .sort((a, b) => a - b);

        const p50 = this.percentile(responseTimes, 0.5);
        const p95 = this.percentile(responseTimes, 0.95);
        const p99 = this.percentile(responseTimes, 0.99);

        // Top used models
        const modelUsage = Object.entries(this.metrics.models.usageCount)
            .map(([modelId, usage]) => ({
                modelId,
                requests: usage.requests,
                successRate: usage.successfulRequests / usage.requests,
                avgResponseTime: usage.totalResponseTime / usage.requests
            }))
            .sort((a, b) => b.requests - a.requests)
            .slice(0, 10);

        // Top endpoints
        const endpointStats = Object.entries(this.metrics.requests.byEndpoint)
            .map(([endpoint, stats]) => ({
                endpoint,
                requests: stats.count,
                avgResponseTime: stats.totalResponseTime / stats.count,
                errorRate: stats.errors / stats.count
            }))
            .sort((a, b) => b.requests - a.requests)
            .slice(0, 10);

        return {
            uptime: now - this.metrics.system.uptime,
            requestsPerHour: recentRequests.length,
            responseTimePercentiles: { p50, p95, p99 },
            errorRate: this.metrics.system.errorRate,
            averageResponseTime: this.metrics.system.averageResponseTime,
            topModels: modelUsage,
            topEndpoints: endpointStats,
            totalRequests: this.metrics.requests.total,
            successfulRequests: this.metrics.requests.successful,
            failedRequests: this.metrics.requests.failed,
            activeModels: this.metrics.models.activeCount,
            totalModels: this.metrics.models.totalRegistered,
            activeAgents: this.metrics.agents.activeCount,
            totalAgents: this.metrics.agents.totalRegistered
        };
    }

    /**
     * Get real-time status
     */
    getRealTimeStatus() {
        const lastMinute = Date.now() - 60000;
        const recentRequests = this.metrics.requests.responseTimeHistory
            .filter(entry => entry.timestamp > lastMinute);

        return {
            timestamp: new Date().toISOString(),
            requestsLastMinute: recentRequests.length,
            averageResponseTimeLastMinute: recentRequests.length > 0 ? 
                recentRequests.reduce((sum, r) => sum + r.responseTime, 0) / recentRequests.length : 0,
            activeModels: this.metrics.models.activeCount,
            activeAgents: this.metrics.agents.activeCount,
            memoryUsage: process.memoryUsage(),
            uptime: Date.now() - this.metrics.system.uptime
        };
    }

    /**
     * Generate daily report
     */
    generateDailyReport() {
        const performance = this.getPerformanceAnalytics();
        const now = new Date();
        
        const report = {
            date: now.toISOString().split('T')[0],
            generated: now.toISOString(),
            summary: {
                totalRequests: performance.totalRequests,
                successRate: (performance.successfulRequests / performance.totalRequests * 100).toFixed(2) + '%',
                averageResponseTime: Math.round(performance.averageResponseTime) + 'ms',
                errorRate: (performance.errorRate * 100).toFixed(2) + '%',
                uptime: this.formatUptime(performance.uptime)
            },
            models: {
                total: performance.totalModels,
                active: performance.activeModels,
                topUsed: performance.topModels,
                byProvider: this.metrics.models.byProvider,
                byType: this.metrics.models.byType
            },
            agents: {
                total: performance.totalAgents,
                active: performance.activeAgents,
                byType: this.metrics.agents.byType
            },
            performance: {
                responseTimePercentiles: performance.responseTimePercentiles,
                topEndpoints: performance.topEndpoints
            }
        };

        return report;
    }

    /**
     * Helper functions
     */
    normalizeEndpoint(url) {
        // Remove query parameters and normalize paths
        const path = url.split('?')[0];
        
        // Replace model IDs and other variables with placeholders
        return path
            .replace(/\/[a-f0-9-]{36}/, '/:id')  // UUIDs
            .replace(/\/models\/[^\/]+/, '/models/:id')
            .replace(/\/agents\/[^\/]+/, '/agents/:id');
    }

    percentile(arr, p) {
        if (arr.length === 0) return 0;
        const index = Math.ceil(arr.length * p) - 1;
        return arr[index] || 0;
    }

    formatUptime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ${hours % 24}h`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }

    async writeAccessLog(entry) {
        const logLine = [
            entry.timestamp,
            entry.ip,
            entry.method,
            entry.url,
            entry.statusCode,
            entry.responseTime + 'ms',
            entry.contentLength + 'b',
            `"${entry.userAgent}"`
        ].join(' ') + '\n';

        try {
            await fs.appendFile(this.accessLogFile, logLine);
        } catch (error) {
            console.error('Failed to write access log:', error);
        }
    }

    async writeErrorLog(entry) {
        const logLine = JSON.stringify(entry) + '\n';

        try {
            await fs.appendFile(this.errorLogFile, logLine);
        } catch (error) {
            console.error('Failed to write error log:', error);
        }
    }

    /**
     * Clean old data to prevent memory leaks
     */
    cleanOldData() {
        const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days

        // Clean response time history
        this.metrics.requests.responseTimeHistory = 
            this.metrics.requests.responseTimeHistory
                .filter(entry => entry.timestamp > cutoff);

        // Clean agent last seen history
        Object.keys(this.metrics.agents.lastSeenHistory).forEach(agentId => {
            this.metrics.agents.lastSeenHistory[agentId] = 
                this.metrics.agents.lastSeenHistory[agentId]
                    .filter(timestamp => timestamp > cutoff);
        });

        console.log('🧹 Cleaned old monitoring data');
    }

    /**
     * Export metrics for external tools (Prometheus, etc.)
     */
    exportPrometheusMetrics() {
        const metrics = [];
        
        // Request metrics
        metrics.push(`registry_requests_total ${this.metrics.requests.total}`);
        metrics.push(`registry_requests_successful ${this.metrics.requests.successful}`);
        metrics.push(`registry_requests_failed ${this.metrics.requests.failed}`);
        metrics.push(`registry_response_time_avg ${this.metrics.system.averageResponseTime}`);
        metrics.push(`registry_error_rate ${this.metrics.system.errorRate}`);

        // Model metrics
        metrics.push(`registry_models_total ${this.metrics.models.totalRegistered}`);
        metrics.push(`registry_models_active ${this.metrics.models.activeCount}`);

        // Agent metrics
        metrics.push(`registry_agents_total ${this.metrics.agents.totalRegistered}`);
        metrics.push(`registry_agents_active ${this.metrics.agents.activeCount}`);

        // System metrics
        const memUsage = process.memoryUsage();
        metrics.push(`registry_memory_rss ${memUsage.rss}`);
        metrics.push(`registry_memory_heap_used ${memUsage.heapUsed}`);
        metrics.push(`registry_uptime ${Date.now() - this.metrics.system.uptime}`);

        return metrics.join('\n');
    }
}

// Express middleware for automatic request logging
function createMonitoringMiddleware(monitor) {
    return (req, res, next) => {
        const startTime = Date.now();
        
        // Override res.end to capture response time
        const originalEnd = res.end;
        res.end = function(...args) {
            const responseTime = Date.now() - startTime;
            monitor.logRequest(req, res, responseTime);
            originalEnd.apply(this, args);
        };

        next();
    };
}

// Health check endpoint middleware
function createHealthCheckEndpoint(monitor) {
    return (req, res) => {
        const status = monitor.getRealTimeStatus();
        const performance = monitor.getPerformanceAnalytics();
        
        const health = {
            status: 'healthy',
            timestamp: status.timestamp,
            uptime: status.uptime,
            requestsLastMinute: status.requestsLastMinute,
            averageResponseTime: status.averageResponseTimeLastMinute,
            errorRate: performance.errorRate,
            models: {
                total: status.activeModels,
                active: status.activeModels
            },
            agents: {
                total: status.activeAgents,
                active: status.activeAgents
            },
            memory: {
                rss: status.memoryUsage.rss,
                heapUsed: status.memoryUsage.heapUsed,
                heapTotal: status.memoryUsage.heapTotal
            }
        };

        // Determine health status
        if (performance.errorRate > 0.1) { // More than 10% errors
            health.status = 'degraded';
        }
        
        if (performance.errorRate > 0.5) { // More than 50% errors
            health.status = 'unhealthy';
        }

        const statusCode = health.status === 'healthy' ? 200 : 
                          health.status === 'degraded' ? 200 : 503;

        res.status(statusCode).json(health);
    };
}

// Metrics endpoint for Prometheus
function createMetricsEndpoint(monitor) {
    return (req, res) => {
        res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
        res.send(monitor.exportPrometheusMetrics());
    };
}

module.exports = {
    RegistryMonitor,
    createMonitoringMiddleware,
    createHealthCheckEndpoint,
    createMetricsEndpoint
};

// CLI interface for monitoring tools
if (require.main === module) {
    const monitor = new RegistryMonitor();
    
    const command = process.argv[2];
    
    switch (command) {
        case 'report':
            console.log(JSON.stringify(monitor.generateDailyReport(), null, 2));
            break;
            
        case 'status':
            console.log(JSON.stringify(monitor.getRealTimeStatus(), null, 2));
            break;
            
        case 'performance':
            console.log(JSON.stringify(monitor.getPerformanceAnalytics(), null, 2));
            break;
            
        case 'metrics':
            console.log(monitor.exportPrometheusMetrics());
            break;
            
        default:
            console.log(`
📊 Registry Monitoring CLI

Usage:
  node registry-monitor.js <command>

Commands:
  report        Generate daily report
  status        Show real-time status
  performance   Show performance analytics
  metrics       Export Prometheus metrics

Examples:
  node registry-monitor.js status
  node registry-monitor.js report > daily-report.json
  node registry-monitor.js metrics
            `);
            break;
    }
}