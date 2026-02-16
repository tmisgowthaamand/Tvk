/**
 * db.js - MongoDB Connection Manager
 * 
 * DB1 (voter_db)  → READ ONLY  – Voter verification
 * DB2 (member_db) → WRITE      – Member requests, grievances, logs
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

let voterClient = null;
let memberClient = null;
let voterDb = null;
let memberDb = null;

// ─── DB1: Voter Database (READ ONLY) ────────────────────

async function connectVoterDB() {
  if (voterDb) return voterDb;
  try {
    console.log('🔌 Connecting to DB1 (Voter Database - READ ONLY)...');
    voterClient = new MongoClient(process.env.MONGO_URI_VOTERS, {
      tls: true,
      serverApi: {
        version: '1',
        strict: true,
        deprecationErrors: true,
      }
    });
    await voterClient.connect();
    voterDb = voterClient.db(process.env.MONGO_DB_VOTERS);
    await voterDb.command({ ping: 1 });
    console.log('✅ DB1 (Voter Database) connected successfully!');
    return voterDb;
  } catch (error) {
    console.error('❌ DB1 connection failed:', error.message);
    throw error;
  }
}

async function getVoterCollection() {
  const db = await connectVoterDB();
  return db.collection(process.env.MONGO_COLLECTION_VOTERS);
}

// ─── DB2: Member Database (WRITE) ───────────────────────

async function connectMemberDB() {
  if (memberDb) return memberDb;
  try {
    console.log('🔌 Connecting to DB2 (Member Database - WRITE)...');
    memberClient = new MongoClient(process.env.MONGO_URI_MEMBERS, {
      tls: true,
      serverApi: {
        version: '1',
        strict: true,
        deprecationErrors: true,
      }
    });
    await memberClient.connect();
    memberDb = memberClient.db(process.env.MONGO_DB_MEMBERS);
    await memberDb.command({ ping: 1 });
    console.log('✅ DB2 (Member Database) connected successfully!');
    return memberDb;
  } catch (error) {
    console.error('❌ DB2 connection failed:', error.message);
    throw error;
  }
}

async function getMemberRequestsCollection() {
  const db = await connectMemberDB();
  return db.collection(process.env.MONGO_COLLECTION_MEMBER_REQUESTS);
}

async function getGrievancesCollection() {
  const db = await connectMemberDB();
  return db.collection(process.env.MONGO_COLLECTION_GRIEVANCES);
}

async function getLogsCollection() {
  const db = await connectMemberDB();
  return db.collection(process.env.MONGO_COLLECTION_LOGS);
}

async function getSuggestionsCollection() {
  const db = await connectMemberDB();
  return db.collection('suggestions');
}

async function getVolunteersCollection() {
  const db = await connectMemberDB();
  return db.collection('volunteers');
}

async function getSubscribersCollection() {
  const db = await connectMemberDB();
  return db.collection('subscribers');
}

// ─── Close All ──────────────────────────────────────────

async function closeConnections() {
  if (voterClient) {
    await voterClient.close();
    voterClient = null;
    voterDb = null;
    console.log('🔒 DB1 (Voter) connection closed.');
  }
  if (memberClient) {
    await memberClient.close();
    memberClient = null;
    memberDb = null;
    console.log('🔒 DB2 (Member) connection closed.');
  }
}

module.exports = {
  connectVoterDB,
  connectMemberDB,
  getVoterCollection,
  getMemberRequestsCollection,
  getGrievancesCollection,
  getLogsCollection,
  getSuggestionsCollection,
  getVolunteersCollection,
  getSubscribersCollection,
  closeConnections
};
