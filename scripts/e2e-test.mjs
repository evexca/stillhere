import assert from 'node:assert';
import prisma from '../app/lib/prisma.ts';

const BASE_URL = 'http://127.0.0.1:3000';

async function runE2ETests() {
  console.log('🚀 Starting Full E2E Integration Audit against real MySQL database...\n');
  let cookieHeader = '';

  // 1. Identity Cookie Verification
  console.log('1️⃣ Testing Anonymous Identity Cookie Assignment...');
  const res = await fetch(`${BASE_URL}/api/identity`, { method: 'POST' });
  assert.strictEqual(res.status, 200, 'Identity endpoint should return 200 OK');
  const setCookieApi = res.headers.get('set-cookie');
  assert.ok(setCookieApi?.includes('_sh_id='), 'Identity endpoint must return _sh_id cookie');
  cookieHeader = setCookieApi.split(';')[0];
  console.log('   ✅ Received identity cookie:', cookieHeader);

  const headers = {
    'Content-Type': 'application/json',
    ...(cookieHeader ? { Cookie: cookieHeader } : {}),
  };

  // 2. Publish Top-Level Post
  console.log('\n2️⃣ Testing Top-Level Post Creation...');
  const postRes = await fetch(`${BASE_URL}/api/posts`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      content: `Testing anonymous ephemerality in production! ${Date.now()}`,
    }),
  });
  const postData = await postRes.json();
  assert.strictEqual(postRes.status, 201, `Post creation should return 201, got ${postRes.status}: ${JSON.stringify(postData)}`);
  assert.ok(postData.post?.publicId, 'Created post must have publicId');
  const createdPostId = postData.post.publicId;
  console.log(`   ✅ Post created successfully with ID: ${createdPostId}`);

  // 3. Confirm 10-Second Post Cooldown
  console.log('\n3️⃣ Testing 10-Second Post Cooldown...');
  const cooldownPostRes = await fetch(`${BASE_URL}/api/posts`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      content: 'Immediate second post to trigger cooldown',
    }),
  });
  assert.strictEqual(cooldownPostRes.status, 429, 'Immediate post must return 429 Rate Limit Cooldown');
  console.log('   ✅ Post cooldown enforced (429 Too Many Requests)');

  // Wait 10s for post cooldown to clear
  console.log('   ⏳ Waiting 10s for post cooldown to elapse...');
  await new Promise((resolve) => setTimeout(resolve, 10500));

  // 4. Publish Reply & 5-Second Cooldown
  console.log('\n4️⃣ Testing Reply Creation & 5-Second Reply Cooldown...');
  const replyRes = await fetch(`${BASE_URL}/api/replies`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      postId: createdPostId,
      content: 'First reply to this thread',
    }),
  });
  const replyData = await replyRes.json();
  assert.strictEqual(replyRes.status, 201, `Reply creation should return 201: ${JSON.stringify(replyData)}`);
  const topReplyId = replyData.reply.publicId;
  console.log(`   ✅ Reply created successfully with ID: ${topReplyId}`);

  // Immediate second reply to trigger 5s cooldown
  const cooldownReplyRes = await fetch(`${BASE_URL}/api/replies`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      postId: createdPostId,
      content: 'Immediate second reply for cooldown test',
    }),
  });
  assert.strictEqual(cooldownReplyRes.status, 429, 'Immediate reply must return 429 Cooldown');
  console.log('   ✅ Reply cooldown enforced (429 Too Many Requests)');

  // Wait 5s for reply cooldown to clear
  console.log('   ⏳ Waiting 5s for reply cooldown to elapse...');
  await new Promise((resolve) => setTimeout(resolve, 5500));

  // 5. Publish Nested Reply (Level 2)
  console.log('\n5️⃣ Testing Nested Reply (Level 2)...');
  const nestedReplyRes = await fetch(`${BASE_URL}/api/replies`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      postId: createdPostId,
      parentId: topReplyId,
      content: 'Nested reply level 2 under first reply',
    }),
  });
  const nestedData = await nestedReplyRes.json();
  assert.strictEqual(nestedReplyRes.status, 201, `Nested reply creation should return 201: ${JSON.stringify(nestedData)}`);
  console.log(`   ✅ Nested reply created successfully under ${topReplyId}`);

  // 6. Test Curated Reactions
  console.log('\n6️⃣ Testing 6 Curated Reactions...');
  const reactions = ['UNDERSTAND', 'NOT_ALONE', 'THAT_HURT', 'NEED_CONTEXT', 'TELL_MORE', 'DISAGREE'];
  for (const reactionType of reactions) {
    const rxRes = await fetch(`${BASE_URL}/api/reactions`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        targetType: 'POST',
        targetId: createdPostId,
        reactionType,
        action: 'ADD',
      }),
    });
    const rxData = await rxRes.json();
    assert.ok(rxRes.status === 200 || rxRes.status === 409, `Reaction ${reactionType} should return 200 or 409: ${JSON.stringify(rxData)}`);
  }
  console.log('   ✅ All 6 reaction types tested successfully');

  // Toggle one reaction off
  const toggleOffRes = await fetch(`${BASE_URL}/api/reactions`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      targetType: 'POST',
      targetId: createdPostId,
      reactionType: 'DISAGREE',
      action: 'REMOVE',
    }),
  });
  const toggleData = await toggleOffRes.json();
  assert.strictEqual(toggleOffRes.status, 200, 'Toggling reaction off should return 200');
  console.log('   ✅ Reaction toggle-off confirmed');

  // 7. My Activity & Notifications API
  console.log('\n7️⃣ Testing My Activity & Notifications API...');
  const activityRes = await fetch(`${BASE_URL}/api/activity`, { headers });
  assert.strictEqual(activityRes.status, 200, 'My Activity should return 200 OK');
  const activityData = await activityRes.json();
  assert.ok(Array.isArray(activityData.myPosts), 'Activity must contain myPosts array');
  assert.ok(Array.isArray(activityData.myReplies), 'Activity must contain myReplies array');
  assert.ok(typeof activityData.unreadCount === 'number', 'Activity must contain unreadCount number');
  console.log(`   ✅ My Activity fetched: ${activityData.myPosts.length} posts, ${activityData.myReplies.length} replies, ${activityData.unreadCount} unread notifications`);

  // 8. Feed Filters Test
  console.log('\n8️⃣ Testing Feed Filters & Pagination...');
  const filters = ['LIVE', 'DISCUSSED', 'DISAPPEARING'];
  for (const filter of filters) {
    const filterRes = await fetch(`${BASE_URL}/api/posts?filter=${filter}`);
    assert.strictEqual(filterRes.status, 200, `Filter ${filter} should return 200 OK`);
    const filterData = await filterRes.json();
    assert.ok(Array.isArray(filterData.posts), `Filter ${filter} must return posts array`);
    console.log(`   ✅ Filter "${filter}": ${filterData.posts.length} posts returned`);
  }

  // 9. Submit Report
  console.log('\n9️⃣ Testing Report Submission...');
  const reportRes = await fetch(`${BASE_URL}/api/reports`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      targetType: 'POST',
      targetId: createdPostId,
      reason: 'SPAM',
      note: 'Automated E2E test report',
    }),
  });
  const reportData = await reportRes.json();
  assert.strictEqual(reportRes.status, 201, `Report submission should return 201: ${JSON.stringify(reportData)}`);
  console.log(`   ✅ Report submitted with ID: ${reportData.reportId}`);

  // 10. Admin Authentication & Dashboard Moderation Actions
  console.log('\n🔟 Testing Admin Authentication & Moderation Panel...');
  const adminAuthRes = await fetch(`${BASE_URL}/api/admin/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@stillhere.app',
      password: 'AdminPassword123!',
    }),
  });
  assert.strictEqual(adminAuthRes.status, 200, 'Admin login should succeed with 200 OK');
  const adminSetCookie = adminAuthRes.headers.get('set-cookie');
  assert.ok(adminSetCookie?.includes('_sh_admin='), 'Admin login must set _sh_admin session cookie');
  const adminHeaders = {
    'Content-Type': 'application/json',
    Cookie: adminSetCookie.split(';')[0],
  };
  console.log('   ✅ Admin authenticated successfully');

  // Admin Hide Post
  const hideRes = await fetch(`${BASE_URL}/api/admin/moderate`, {
    method: 'PUT',
    headers: adminHeaders,
    body: JSON.stringify({ action: 'HIDE_POST', targetId: createdPostId, reason: 'E2E Hide test' }),
  });
  assert.strictEqual(hideRes.status, 200, 'Hide post should return 200 OK');
  console.log('   ✅ Admin action: HIDE_POST confirmed');

  // Admin Restore Post
  const restoreRes = await fetch(`${BASE_URL}/api/admin/moderate`, {
    method: 'PUT',
    headers: adminHeaders,
    body: JSON.stringify({ action: 'RESTORE_POST', targetId: createdPostId, reason: 'E2E Restore test' }),
  });
  assert.strictEqual(restoreRes.status, 200, 'Restore post should return 200 OK');
  console.log('   ✅ Admin action: RESTORE_POST confirmed');

  // Admin Add & Manage Blocked Terms
  const addTermRes = await fetch(`${BASE_URL}/api/admin/moderate`, {
    method: 'PUT',
    headers: adminHeaders,
    body: JSON.stringify({ action: 'ADD_BLOCKED_TERM', pattern: `badwordtest_${Date.now()}`, isRegex: false }),
  });
  assert.strictEqual(addTermRes.status, 200, 'ADD_BLOCKED_TERM should return 200 OK');
  console.log('   ✅ Admin action: ADD_BLOCKED_TERM confirmed');

  // Admin Add & Manage Daily Themes
  const addThemeRes = await fetch(`${BASE_URL}/api/admin/moderate`, {
    method: 'PUT',
    headers: adminHeaders,
    body: JSON.stringify({ action: 'ADD_THEME', themeText: `E2E Test Theme Question ${Date.now()}?` }),
  });
  assert.strictEqual(addThemeRes.status, 200, 'ADD_THEME should return 200 OK');
  console.log('   ✅ Admin action: ADD_THEME confirmed');

  // Admin Delete Post
  const deleteRes = await fetch(`${BASE_URL}/api/admin/moderate`, {
    method: 'PUT',
    headers: adminHeaders,
    body: JSON.stringify({ action: 'DELETE_POST', targetId: createdPostId, reason: 'E2E Permanent Delete' }),
  });
  assert.strictEqual(deleteRes.status, 200, 'DELETE_POST should return 200 OK');
  console.log('   ✅ Admin action: DELETE_POST confirmed (text erased)');

  // Verify deleted post content is erased in database
  const dbPost = await prisma.post.findUnique({ where: { publicId: createdPostId } });
  assert.strictEqual(dbPost.status, 'DELETED', 'Post status must be DELETED in DB');
  assert.strictEqual(dbPost.content, '', 'Post content must be empty string in DB after deletion');
  console.log('   ✅ DB Verification: Deleted post text is completely erased in MySQL!');

  console.log('\n🎉 ALL 10 E2E INTEGRATION & MODERATION TESTS PASSED CLEANLY WITH REAL MYSQL DATABASE!');
}

runE2ETests().catch((err) => {
  console.error('\n❌ E2E Integration Audit Failed:', err);
  process.exit(1);
});
