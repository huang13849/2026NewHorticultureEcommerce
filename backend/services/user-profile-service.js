// backend/services/user-profile-service.js
// PG-backed user profile service (plant_collector.user_profiles + user_addresses).
// Same public API as the previous Mongo implementation — callers unchanged.
// Zitadel still holds auth identity (loginName/email/phone); PG holds everything else:
//   OneID, source project, user type, gender, tags, addresses (with lat/lng), preferences, cart, garden stats.
'use strict';
const pg = require('../lib/pgProfiles');

async function getByZid(zid) { return pg.getByZid(zid); }
async function getByOneId(oneId) { return pg.getByOneId(oneId); }

async function upsertFromLogin(user) {
  // user = { zid, loginName, nickname, orgId, brand, zitadelInstance?, sourceProject?, phone?, email?, gender?, userType? }
  return pg.upsertFromLogin(user);
}

async function patchProfile(zid, body) { return pg.patchProfile(zid, body); }
async function listAddresses(zid) { return pg.listAddresses(zid); }
async function upsertAddress(zid, addr) { return pg.upsertAddress(zid, addr); }
async function deleteAddress(zid, id)   { return pg.deleteAddress(zid, id); }
async function setDefaultAddress(zid, id) { return pg.setDefaultAddress(zid, id); }
async function setAddressGeo(zid, id, geo) { return pg.setAddressGeo(zid, id, geo); }

module.exports = {
  getByZid, getByOneId, upsertFromLogin, patchProfile,
  listAddresses, upsertAddress, deleteAddress, setDefaultAddress, setAddressGeo,
  // legacy alias — some old code referenced COL='user_profiles'
  COL: 'plant_collector.user_profiles',
};
