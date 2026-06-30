import { getClienteCompleto } from './src/app/actions/crm';
async function run() {
  const res = await getClienteCompleto("0bcd2d13-32c1-4410-8d9c-e766ba13900b");
  console.log(JSON.stringify(res, null, 2));
}
run();
