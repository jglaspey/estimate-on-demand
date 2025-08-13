#!/bin/bash

echo "🚀 Starting Parallel LLM Evaluation Tests"
echo "========================================="
echo "Running 5 models in parallel, each testing 3 documents..."
echo ""

# Create a timestamp for this test run
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
echo "Test run: $TIMESTAMP"

# Start all tests in parallel (background processes)
echo "⏳ Starting tests..."

npx tsx lib/testing/test-claude-sonnet4.ts > "lib/testing/logs/claude-sonnet4-$TIMESTAMP.log" 2>&1 &
CLAUDE_SONNET_PID=$!
echo "🤖 Claude Sonnet 4 started (PID: $CLAUDE_SONNET_PID)"

npx tsx lib/testing/test-claude-haiku.ts > "lib/testing/logs/claude-haiku-$TIMESTAMP.log" 2>&1 &
CLAUDE_HAIKU_PID=$!
echo "🤖 Claude Haiku 3.5 started (PID: $CLAUDE_HAIKU_PID)"

npx tsx lib/testing/test-gpt5.ts > "lib/testing/logs/gpt5-$TIMESTAMP.log" 2>&1 &
GPT5_PID=$!
echo "🤖 GPT-5 started (PID: $GPT5_PID)"

npx tsx lib/testing/test-gpt5-mini.ts > "lib/testing/logs/gpt5-mini-$TIMESTAMP.log" 2>&1 &
GPT5_MINI_PID=$!
echo "🤖 GPT-5-mini started (PID: $GPT5_MINI_PID)"

npx tsx lib/testing/test-gemini-flash-lite.ts > "lib/testing/logs/gemini-flash-lite-$TIMESTAMP.log" 2>&1 &
GEMINI_LITE_PID=$!
echo "🤖 Gemini 2.5 Flash-Lite started (PID: $GEMINI_LITE_PID)"

echo ""
echo "⏱️ All tests running in parallel..."
echo "💡 You can monitor progress with:"
echo "   tail -f lib/testing/logs/*-$TIMESTAMP.log"
echo ""

# Wait for all processes to complete
echo "⌛ Waiting for tests to complete..."

wait $CLAUDE_SONNET_PID
echo "✅ Claude Sonnet 4 completed"

wait $CLAUDE_HAIKU_PID  
echo "✅ Claude Haiku 3.5 completed"

wait $GPT5_PID
echo "✅ GPT-5 completed"

wait $GPT5_MINI_PID
echo "✅ GPT-5-mini completed"

wait $GEMINI_LITE_PID
echo "✅ Gemini 2.5 Flash-Lite completed"

echo ""
echo "🎉 All tests completed!"
echo ""
echo "📊 Results saved to:"
echo "  • lib/testing/claude-sonnet4-results.json"
echo "  • lib/testing/claude-haiku-results.json"
echo "  • lib/testing/gpt5-results.json"
echo "  • lib/testing/gpt5-mini-results.json"
echo "  • lib/testing/gemini-flash-lite-results.json"
echo ""
echo "📋 Logs saved to:"
echo "  • lib/testing/logs/*-$TIMESTAMP.log"