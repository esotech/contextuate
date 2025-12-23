#!/usr/bin/env node

/**
 * Redis Integration Test
 *
 * Tests the Redis adapter and hook script integration.
 * Requires a running Redis server.
 */

const path = require('path');
const { spawn } = require('child_process');

async function testRedisConnection() {
  console.log('Testing Redis connection...');

  try {
    const Redis = require('ioredis');
    const client = new Redis({
      host: 'localhost',
      port: 6379,
      lazyConnect: true,
    });

    await client.connect();
    const result = await client.ping();
    console.log('✓ Redis connection successful:', result);
    client.disconnect();
    return true;
  } catch (err) {
    console.error('✗ Redis connection failed:', err.message);
    console.error('  Make sure Redis is running: redis-server');
    return false;
  }
}

async function testEventPublish() {
  console.log('\nTesting event publishing...');

  try {
    const Redis = require('ioredis');
    const publisher = new Redis({
      host: 'localhost',
      port: 6379,
    });

    const testEvent = {
      id: 'test-123',
      timestamp: Date.now(),
      sessionId: 'test-session',
      machineId: 'test-machine',
      workingDirectory: '/test',
      eventType: 'message',
      hookType: 'Notification',
      data: { message: 'Test event' },
    };

    const subscriberCount = await publisher.publish('contextuate:events', JSON.stringify(testEvent));
    console.log(`✓ Event published to ${subscriberCount} subscribers`);

    publisher.disconnect();
    return true;
  } catch (err) {
    console.error('✗ Event publish failed:', err.message);
    return false;
  }
}

async function testEventSubscribe() {
  console.log('\nTesting event subscription...');

  return new Promise((resolve) => {
    try {
      const Redis = require('ioredis');
      const subscriber = new Redis({
        host: 'localhost',
        port: 6379,
      });

      const publisher = new Redis({
        host: 'localhost',
        port: 6379,
      });

      let received = false;

      subscriber.subscribe('contextuate:events', (err) => {
        if (err) {
          console.error('✗ Subscribe failed:', err.message);
          subscriber.disconnect();
          publisher.disconnect();
          resolve(false);
          return;
        }

        console.log('✓ Subscribed to channel');

        // Publish a test event
        const testEvent = {
          id: 'test-456',
          timestamp: Date.now(),
          sessionId: 'test-session-2',
          machineId: 'test-machine-2',
          workingDirectory: '/test',
          eventType: 'message',
          hookType: 'Notification',
          data: { message: 'Test subscription event' },
        };

        setTimeout(() => {
          publisher.publish('contextuate:events', JSON.stringify(testEvent));
        }, 100);
      });

      subscriber.on('message', (channel, message) => {
        if (!received) {
          received = true;
          const event = JSON.parse(message);
          console.log('✓ Event received:', event.id);

          subscriber.disconnect();
          publisher.disconnect();
          resolve(true);
        }
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        if (!received) {
          console.error('✗ No event received within timeout');
          subscriber.disconnect();
          publisher.disconnect();
          resolve(false);
        }
      }, 5000);
    } catch (err) {
      console.error('✗ Subscription test failed:', err.message);
      resolve(false);
    }
  });
}

async function testHookScript() {
  console.log('\nTesting hook script with Redis...');

  const hookScript = path.join(__dirname, '../src/monitor/hooks/emit-event.js');

  // Create test config
  const testConfig = {
    mode: 'redis',
    socketPath: '/tmp/contextuate-monitor.sock',
    redis: {
      host: 'localhost',
      port: 6379,
      password: null,
      channel: 'contextuate:test',
    },
  };

  const configPath = '/tmp/contextuate-test-config.json';
  const fs = require('fs');
  fs.writeFileSync(configPath, JSON.stringify(testConfig, null, 2));

  return new Promise((resolve) => {
    try {
      const Redis = require('ioredis');
      const subscriber = new Redis({
        host: 'localhost',
        port: 6379,
      });

      let received = false;

      subscriber.subscribe('contextuate:test', (err) => {
        if (err) {
          console.error('✗ Subscribe failed:', err.message);
          subscriber.disconnect();
          fs.unlinkSync(configPath);
          resolve(false);
          return;
        }

        // Trigger hook script
        const hookPayload = {
          hook_type: 'Notification',
          message: 'Test message from hook script',
        };

        const hookProcess = spawn('node', [hookScript], {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, HOME: '/tmp' },
        });

        hookProcess.stdin.write(JSON.stringify(hookPayload));
        hookProcess.stdin.end();

        hookProcess.on('close', (code) => {
          if (code !== 0) {
            console.error('✗ Hook script exited with code:', code);
          }
        });
      });

      subscriber.on('message', (channel, message) => {
        if (!received) {
          received = true;
          const event = JSON.parse(message);
          console.log('✓ Hook script event received:', event.eventType);

          subscriber.disconnect();
          fs.unlinkSync(configPath);
          resolve(true);
        }
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        if (!received) {
          console.error('✗ No event from hook script within timeout');
          subscriber.disconnect();
          if (fs.existsSync(configPath)) {
            fs.unlinkSync(configPath);
          }
          resolve(false);
        }
      }, 5000);
    } catch (err) {
      console.error('✗ Hook script test failed:', err.message);
      resolve(false);
    }
  });
}

async function main() {
  console.log('='.repeat(60));
  console.log('Redis Integration Test');
  console.log('='.repeat(60));

  const tests = [
    { name: 'Redis Connection', fn: testRedisConnection },
    { name: 'Event Publish', fn: testEventPublish },
    { name: 'Event Subscribe', fn: testEventSubscribe },
    { name: 'Hook Script', fn: testHookScript },
  ];

  const results = [];

  for (const test of tests) {
    const result = await test.fn();
    results.push({ name: test.name, passed: result });
  }

  console.log('\n' + '='.repeat(60));
  console.log('Test Results:');
  console.log('='.repeat(60));

  let passed = 0;
  let failed = 0;

  for (const result of results) {
    const status = result.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`${status} - ${result.name}`);
    if (result.passed) {
      passed++;
    } else {
      failed++;
    }
  }

  console.log('='.repeat(60));
  console.log(`Total: ${passed} passed, ${failed} failed`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
