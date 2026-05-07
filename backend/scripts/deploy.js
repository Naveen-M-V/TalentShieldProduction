#!/usr/bin/env node

/**
 * Deployment Script for HRMS Application
 * Usage: node scripts/deploy.js [environment]
 * Environments: development, staging, production
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class DeploymentManager {
  constructor() {
    this.environment = process.argv[2] || 'development';
    this.validEnvironments = ['development', 'staging', 'production'];
    
    if (!this.validEnvironments.includes(this.environment)) {
      console.error(`❌ Invalid environment: ${this.environment}`);
      console.log(`Valid environments: ${this.validEnvironments.join(', ')}`);
      process.exit(1);
    }
  }

  async deploy() {
    console.log(`🚀 Starting deployment for ${this.environment} environment...`);
    
    try {
      await this.validateEnvironment();
      await this.setEnvironmentVariables();
      await this.installDependencies();
      await this.runTests();
      await this.buildApplication();
      await this.startServices();
      
      console.log(`✅ Deployment completed successfully for ${this.environment}!`);
    } catch (error) {
      console.error(`❌ Deployment failed:`, error.message);
      process.exit(1);
    }
  }

  async validateEnvironment() {
    console.log('🔍 Validating environment configuration...');
    
    const envFiles = {
      development: '.env',
      staging: '.env.deployment',
      production: '.env.production'
    };

    const envFile = envFiles[this.environment];
    const envPath = path.resolve(process.cwd(), envFile);

    if (!fs.existsSync(envPath)) {
      throw new Error(`Environment file not found: ${envFile}`);
    }

    console.log(`✅ Environment file validated: ${envFile}`);
  }

  async setEnvironmentVariables() {
    console.log('🔧 Setting environment variables...');
    
    // Set NODE_ENV
    process.env.NODE_ENV = this.environment === 'staging' ? 'staging' : this.environment;
    
    console.log(`✅ NODE_ENV set to: ${process.env.NODE_ENV}`);
  }

  async installDependencies() {
    console.log('📦 Installing dependencies...');
    
    try {
      // Backend dependencies
      console.log('Installing backend dependencies...');
      execSync('npm ci', { stdio: 'inherit', cwd: path.resolve(process.cwd()) });
      
      // Frontend dependencies
      console.log('Installing frontend dependencies...');
      execSync('npm ci', { stdio: 'inherit', cwd: path.resolve(process.cwd(), 'frontend') });
      
      console.log('✅ Dependencies installed successfully');
    } catch (error) {
      throw new Error(`Failed to install dependencies: ${error.message}`);
    }
  }

  async runTests() {
    if (this.environment === 'production') {
      console.log('🧪 Running tests...');
      
      try {
        // Run backend tests (if they exist)
        if (fs.existsSync(path.resolve(process.cwd(), 'test'))) {
          console.log('Running backend tests...');
          execSync('npm test', { stdio: 'inherit', cwd: process.cwd() });
        }
        
        // Run frontend tests (if they exist)
        if (fs.existsSync(path.resolve(process.cwd(), 'frontend/src/__tests__'))) {
          console.log('Running frontend tests...');
          execSync('npm test -- --watchAll=false', { stdio: 'inherit', cwd: path.resolve(process.cwd(), 'frontend') });
        }
        
        console.log('✅ All tests passed');
      } catch (error) {
        throw new Error(`Tests failed: ${error.message}`);
      }
    } else {
      console.log('⏭️  Skipping tests for non-production environment');
    }
  }

  async buildApplication() {
    console.log('🏗️  Building application...');
    
    try {
      // Build frontend
      console.log('Building frontend...');
      const frontendEnv = this.environment === 'staging' ? 'staging' : this.environment;
      execSync(`npm run build`, { 
        stdio: 'inherit', 
        cwd: path.resolve(process.cwd(), 'frontend'),
        env: { ...process.env, NODE_ENV: frontendEnv }
      });
      
      console.log('✅ Application built successfully');
    } catch (error) {
      throw new Error(`Build failed: ${error.message}`);
    }
  }

  async startServices() {
    console.log('🚀 Starting services...');
    
    const commands = {
      development: 'npm run dev',
      staging: 'npm start',
      production: 'npm start'
    };

    const command = commands[this.environment];
    
    console.log(`Starting with command: ${command}`);
    console.log('✅ Services configuration ready');
    console.log(`🌐 Application will be available on the configured port`);
    
    if (this.environment !== 'development') {
      console.log('💡 To start the application, run:');
      console.log(`   NODE_ENV=${this.environment} ${command}`);
    }
  }
}

// Run deployment
const deployer = new DeploymentManager();
deployer.deploy();
