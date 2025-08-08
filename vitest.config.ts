import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    // Start with happy-dom environment, we'll add browser mode later
    environment: 'happy-dom',
    
    // Test files configuration
    include: ['test/**/*.test.ts'],
    exclude: ['node_modules/**', 'dist/**'],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/**',
        'test/**',
        'coverage/**',
        'dist/**',
        '**/*.config.*',
        '**/*.test.*',
        '**/demo/**',
        '**/docs/**',
      ],
      // Coverage thresholds
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
    
    // Test timeout configuration
    testTimeout: 10000,
    hookTimeout: 10000,
    
    // Setup files
    setupFiles: ['./test/vitest-setup.ts'],
    
    // Global test configuration
    globals: true,
    
    // Pool configuration for better performance
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false,
      },
    },
  },
  
  // Vite configuration for test environment
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  
  // Define environment variables
  define: {
    'process.env.NODE_ENV': JSON.stringify('test'),
  },
  
  // Configure dev server for testing
  server: {
    fs: {
      allow: ['..'],
    },
  },
})