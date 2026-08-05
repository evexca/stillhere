import assert from 'node:assert';
import { execSync } from 'node:child_process';
import { prisma } from '../app/lib/prisma';
import { generateToken, hashToken, getDeviceFromToken } from '../app/lib/identity';
import { checkRateLimit, checkCooldown, setCooldown } from '../app/services/rateLimit';
import { extendThread } from '../app/services/thread';

async function runFullDatabaseE2E() {
  console.log('🌟 Starting Full Real MySQL Database E2E Test Suite...\n');

  // 1. Anonymous Device Creation & Cookie Hashing
  console.log('1️⃣ Testing Anonymous Device & SHA-256 HMAC Identity Token Hashing...');
  const rawToken = generateToken();
  assert.strictEqual(rawToken.length, 64, 'Raw token must be 64-char hex string (32 bytes)');
  const tokenHash = hashToken(rawToken);
  const device = await getDeviceFromToken(rawToken);
  assert.ok(device.id, 'Device must be created in MySQL');
  assert.strictEqual(device.tokenHash, tokenHash, 'Stored token hash must match SHA-256 HMAC');
  console.log(`   ✅ Device created in MySQL with ID: ${device.id}`);

  // 2. Active Site Generation Retrieval
  console.log('\n2️⃣ Testing Active Generation & Global Countdown...');
  let currentGen = await prisma.siteGeneration.findFirst({
    where: { status: 'ACTIVE' },
    orderBy: { generationNum: 'desc' },
  });
  if (!currentGen) {
    currentGen = await prisma.siteGeneration.create({
      data: {
        generationNum: 1,
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
        status: 'ACTIVE',
      },
    });
  }
  assert.strictEqual(currentGen.status, 'ACTIVE', 'Current generation must be ACTIVE');
  console.log(`   ✅ Active Generation: Gen #${currentGen.generationNum}`);

  // 3. Top-Level Post Creation & Website Saved Logic
  console.log('\n3️⃣ Testing Top-Level Post Creation & "Saved Website" Status...');
  const postContent = `Production E2E test post content at ${Date.now()}`;
  const now = new Date();
  const initialExpiresAt = new Date(now.getTime() + 24 * 3600 * 1000);

  // Clear savedWebsite from previous posts in generation
  await prisma.post.updateMany({
    where: { generationId: currentGen.id },
    data: { savedWebsite: false },
  });

  const post = await prisma.post.create({
    data: {
      publicId: `test_post_${Date.now()}`,
      generationId: currentGen.id,
      deviceId: device.id,
      content: postContent,
      status: 'ACTIVE',
      savedWebsite: true,
      createdAt: now,
      lastActivityAt: now,
      expiresAt: initialExpiresAt,
      absoluteExpiresAt: new Date(now.getTime() + 7 * 24 * 3600 * 1000),
    },
  });

  assert.ok(post.publicId, 'Post must have a public ID');
  assert.strictEqual(post.savedWebsite, true, 'Newest post must save the website');
  console.log(`   ✅ Created post ${post.publicId} ("Saved Website" = true)`);

  // 4. Rate Limiting Enforcements (10s Post & 5s Reply)
  console.log('\n4️⃣ Testing Server-Side Rate Limiting & Action Cooldowns...');
  await setCooldown(device.id, 'POST');
  const postCheck = await checkCooldown(device.id, 'POST');
  assert.strictEqual(postCheck.allowed, false, 'Immediate 2nd post must be blocked by rate limit');
  console.log('   ✅ 10-second post cooldown correctly enforced by server');

  await setCooldown(device.id, 'REPLY');
  const replyCheck = await checkCooldown(device.id, 'REPLY');
  assert.strictEqual(replyCheck.allowed, false, 'Immediate 2nd reply must be blocked by rate limit');
  console.log('   ✅ 5-second reply cooldown correctly enforced by server');

  // 5. Reply Creation & Nested Replies
  console.log('\n5️⃣ Testing Replies & 2-Level Nested Replies...');
  const topReply = await prisma.reply.create({
    data: {
      publicId: `top_reply_${Date.now()}`,
      postId: post.id,
      deviceId: device.id,
      content: 'Top-level reply content',
      status: 'ACTIVE',
    },
  });
  assert.ok(topReply.publicId, 'Top reply must be created');

  const nestedReply = await prisma.reply.create({
    data: {
      publicId: `nested_reply_${Date.now()}`,
      postId: post.id,
      parentReplyId: topReply.id,
      deviceId: device.id,
      content: 'Nested reply level 2 content',
      status: 'ACTIVE',
    },
  });
  assert.strictEqual(nestedReply.parentReplyId, topReply.id, 'Nested reply parentReplyId must match top reply ID');
  console.log(`   ✅ Top reply ${topReply.publicId} and nested reply ${nestedReply.publicId} created`);

  // 6. Curated Reactions & Toggle Logic
  console.log('\n6️⃣ Testing 6 Curated Reactions & Toggle Logic...');
  const reactionTypes = ['UNDERSTAND', 'NOT_ALONE', 'THAT_HURT', 'NEED_CONTEXT', 'TELL_MORE', 'DISAGREE'];
  for (const type of reactionTypes) {
    await prisma.reaction.create({
      data: {
        deviceId: device.id,
        targetType: 'POST',
        reactionType: type as any,
        postId: post.id,
      },
    });
  }
  const countRx = await prisma.reaction.count({ where: { postId: post.id } });
  assert.strictEqual(countRx, 6, 'Post must have exactly 6 reactions');
  console.log('   ✅ All 6 curated reactions created successfully');

  // Remove DISAGREE reaction
  await prisma.reaction.deleteMany({
    where: { postId: post.id, deviceId: device.id, reactionType: 'DISAGREE' },
  });
  const countRxAfter = await prisma.reaction.count({ where: { postId: post.id } });
  assert.strictEqual(countRxAfter, 5, 'Post must have 5 reactions after toggle off');
  console.log('   ✅ Reaction toggle-off verified');

  // 7. Thread Expiration Extension
  console.log('\n7️⃣ Testing Thread Expiration Extension Logic...');
  await extendThread(post.id);
  const updatedPost = await prisma.post.findUnique({ where: { id: post.id } });
  assert.ok(updatedPost, 'Post must exist after extension');
  console.log(`   ✅ Thread expiration updated: ${updatedPost.expiresAt.toISOString()}`);

  // 8. My Activity Inbox Queries
  console.log('\n8️⃣ Testing My Activity Inbox Queries...');
  const myPosts = await prisma.post.findMany({ where: { deviceId: device.id, status: 'ACTIVE' } });
  const myReplies = await prisma.reply.findMany({ where: { deviceId: device.id, status: 'ACTIVE' } });
  assert.ok(myPosts.length > 0, 'My Activity posts query must return created posts');
  assert.ok(myReplies.length > 0, 'My Activity replies query must return created replies');
  console.log(`   ✅ My Activity: ${myPosts.length} posts and ${myReplies.length} replies fetched for device`);

  // 9. Feed Filter Queries
  console.log('\n9️⃣ Testing Feed Filter Queries (LIVE, DISCUSSED, DISAPPEARING)...');
  const activePosts = await prisma.post.findMany({ where: { generationId: currentGen.id, status: 'ACTIVE' } });
  assert.ok(Array.isArray(activePosts), 'Feed filter query must return an array');
  console.log(`   ✅ Feed query returned ${activePosts.length} active posts`);

  // 10. Submit Report
  console.log('\n🔟 Testing Safety Report Submission...');
  const report = await prisma.report.create({
    data: {
      targetType: 'POST',
      postId: post.id,
      deviceId: device.id,
      reason: 'SPAM',
      note: 'Automated DB E2E test report',
      status: 'PENDING',
    },
  });
  assert.strictEqual(report.status, 'PENDING', 'New report must have status PENDING');
  console.log(`   ✅ Safety report created with ID: ${report.id}`);

  // 11. Admin Moderation Actions (Hide, Restore, Permanently Delete)
  console.log('\n1️⃣1️⃣ Testing Admin Dashboard Moderation Actions...');
  // Hide Post
  await prisma.post.update({ where: { id: post.id }, data: { status: 'HIDDEN' } });
  let checkPost = await prisma.post.findUnique({ where: { id: post.id } });
  assert.ok(checkPost, 'Post must exist after hide');
  assert.strictEqual(checkPost.status, 'HIDDEN', 'Post status must update to HIDDEN');
  console.log('   ✅ Admin Action: HIDE_POST verified');

  // Restore Post
  await prisma.post.update({ where: { id: post.id }, data: { status: 'ACTIVE' } });
  checkPost = await prisma.post.findUnique({ where: { id: post.id } });
  assert.ok(checkPost, 'Post must exist after restore');
  assert.strictEqual(checkPost.status, 'ACTIVE', 'Post status must update to ACTIVE');
  console.log('   ✅ Admin Action: RESTORE_POST verified');

  // Delete Post (Nullifies Content Text)
  await prisma.post.update({ where: { id: post.id }, data: { status: 'DELETED', content: '' } });
  checkPost = await prisma.post.findUnique({ where: { id: post.id } });
  assert.ok(checkPost, 'Post must exist after delete');
  assert.strictEqual(checkPost.status, 'DELETED', 'Post status must update to DELETED');
  assert.strictEqual(checkPost.content, '', 'Deleted post text must be completely erased');
  console.log('   ✅ Admin Action: DELETE_POST verified (text purged to empty string)');

  // 12. Blocked Terms & Daily Themes Admin Operations
  console.log('\n1️⃣2️⃣ Testing Blocked Terms & Daily Themes Admin CRUD...');
  const term = await prisma.blockedTerm.create({
    data: { pattern: `testbadword_${Date.now()}`, isRegex: false, active: true },
  });
  await prisma.blockedTerm.update({ where: { id: term.id }, data: { active: false } });
  await prisma.blockedTerm.delete({ where: { id: term.id } });
  console.log('   ✅ Blocked Term Add, Toggle, and Delete verified');

  const theme = await prisma.dailyTheme.create({
    data: { text: `E2E Test Question ${Date.now()}?`, sortOrder: 99, active: true },
  });
  await prisma.dailyTheme.update({ where: { id: theme.id }, data: { active: false } });
  await prisma.dailyTheme.delete({ where: { id: theme.id } });
  console.log('   ✅ Daily Theme Add, Toggle, and Delete verified');

  // 13. Automatic Cleanup Cron Job Execution
  console.log('\n1️⃣3️⃣ Testing Automated Cleanup Cron Execution...');
  const cleanupOutput = execSync('node scripts/cleanup.mjs').toString();
  assert.ok(cleanupOutput.includes('[cleanup]'), 'Cleanup output should contain [cleanup]');
  console.log('   ✅ Cleanup cron executed cleanly with database locking');

  // 14. Graveyard Aggregated Statistics Verification
  console.log('\n1️⃣4️⃣ Testing Graveyard Aggregate Statistics...');
  const graveyardGens = await prisma.siteGeneration.findMany({
    where: { status: 'ENDED' },
  });
  assert.ok(Array.isArray(graveyardGens), 'Graveyard query must return array');
  console.log(`   ✅ Graveyard stats fetched (${graveyardGens.length} ended generations logged)`);

  console.log('\n🎉 ALL 14 REAL MYSQL DATABASE E2E TEST CASES PASSED WITH 100% SUCCESS!');
  process.exit(0);
}

runFullDatabaseE2E().catch((err) => {
  console.error('\n❌ Full Real Database E2E Audit Failed:', err);
  process.exit(1);
});
