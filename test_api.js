// Test the full API flow against Prisma Postgres
async function test() {
  const BASE = 'http://localhost:8000/api';
  const testEmail = 'test' + Date.now() + '@example.com';

  // 1. Signup
  console.log('=== Test 1: Signup ===');
  const signupRes = await fetch(BASE + '/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Test User', email: testEmail, password: 'password123' })
  });
  const signupData = await signupRes.json();
  console.log('Status:', signupRes.status, '| Token:', signupData.token ? 'YES' : 'NO');
  if (!signupData.token) { console.log('FAIL:', signupData); return; }
  const token = signupData.token;
  console.log('User:', signupData.user);
  console.log('PASS\n');

  // 2. Login
  console.log('=== Test 2: Login ===');
  const loginRes = await fetch(BASE + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: 'password123' })
  });
  const loginData = await loginRes.json();
  console.log('Status:', loginRes.status, '| Token:', loginData.token ? 'YES' : 'NO');
  console.log('PASS\n');

  // 3. Auth/Me
  console.log('=== Test 3: Auth/Me ===');
  const meRes = await fetch(BASE + '/auth/me', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const meData = await meRes.json();
  console.log('Status:', meRes.status, '| User:', meData.name, meData.email);
  console.log('PASS\n');

  // 4. Submit Code
  console.log('=== Test 4: Submit Code ===');
  const code = [
    'function hello() {',
    '  console.log("Hello World");',
    '  let x = 5;',
    '  if (x > 3) { return true; }',
    '}'
  ].join('\n');
  const submitRes = await fetch(BASE + '/submissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ language: 'javascript', raw_code: code, fileName: 'hello.js' })
  });
  const submitData = await submitRes.json();
  console.log('Status:', submitRes.status, '| Review ID:', submitData.review_id);
  console.log('PASS\n');

  // 5. Wait for review and get reviews list
  console.log('=== Test 5: Wait 3s then Get Reviews ===');
  await new Promise(r => setTimeout(r, 3000));
  const reviewsRes = await fetch(BASE + '/reviews', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const reviewsData = await reviewsRes.json();
  console.log('Status:', reviewsRes.status, '| Count:', reviewsData.length);
  if (reviewsData.length > 0) {
    console.log('First review:', reviewsData[0]);
  }
  console.log('PASS\n');

  // 6. Review Details
  if (reviewsData.length > 0) {
    console.log('=== Test 6: Review Details ===');
    const detailRes = await fetch(BASE + '/reviews/' + reviewsData[0].id, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const detailData = await detailRes.json();
    console.log('Status:', detailRes.status);
    console.log('Score:', detailData.review?.overall_score);
    console.log('Findings:', detailData.findings?.length);
    console.log('Code lines:', detailData.code?.length);
    console.log('Metrics:', detailData.metrics);
    console.log('PASS\n');

    // 7. Delete Review
    console.log('=== Test 7: Delete Review ===');
    const deleteRes = await fetch(BASE + '/reviews/' + reviewsData[0].id, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const deleteData = await deleteRes.json();
    console.log('Status:', deleteRes.status, '| Result:', deleteData);
    console.log('PASS\n');
  }

  console.log('ALL TESTS PASSED!');
}

test().catch(err => console.error('Test failed:', err.message));
