async function checkLogin() {
  const r = await fetch('https://san-erp-staging-1-40952978.dev.odoo.com/web/login');
  const html = await r.text();
  console.log('Login HTML length:', html.length);
  const title = html.match(/<title>(.*?)<\/title>/i);
  console.log('Page Title:', title ? title[1] : 'none');
  const dbs = html.match(/name="db"\s+value="([^"]+)"/);
  console.log('DB in form:', dbs ? dbs[1] : 'no db input in form');
}
checkLogin();

