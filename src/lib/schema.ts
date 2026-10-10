export const SCHEMA = `
create table if not exists company(
  id text primary key, name text not null, country text not null, currency text not null,
  monthly_budget real not null, purchase_cap real not null);
create table if not exists machine(
  id text primary key, company_id text not null, name text not null, nameplate_model text not null,
  hotend text not null, hours_total real not null, downtime_cost_per_hour real not null,
  mcp_token_hash text not null);
create table if not exists stock(
  machine_id text not null, part_type text not null, qty integer not null, min_qty integer not null,
  rated_life_hours real not null, hours_since_replace real not null,
  primary key(machine_id, part_type));
create table if not exists photo(
  id text primary key, machine_id text not null, nameplate_model text, hotend text,
  visible_damage text not null, confidence real not null, created_at integer not null);
create table if not exists event(
  id text primary key, machine_id text not null, source text not null,
  payload text not null, created_at integer not null);
create table if not exists quote(
  id text primary key, item_id text not null, price real not null, currency text not null,
  valid_until integer not null);
create table if not exists proposal(
  id text primary key, event_id text not null, machine_id text not null, part_type text not null,
  item_id text, variant_id text, quote_id text, status text not null,
  verification text, reason text, created_at integer not null);
create table if not exists purchase(
  id text primary key, proposal_id text not null, provider text not null, provider_ref text,
  amount real not null, currency text not null, amount_mxn real not null,
  status text not null, created_at integer not null);
`;
