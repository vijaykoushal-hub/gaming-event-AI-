import { db, auth } from "./firebase";
import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  addDoc,
  deleteDoc,
  getDoc,
  increment,
  onSnapshot
} from "firebase/firestore";
import { TournamentEvent, LeaderboardRank, EventRegistration, WithdrawalRequest, InAppNotification, UserProfile, MatchMessage, WalletTransaction } from "./types";
import { INITIAL_TOURNAMENTS, INITIAL_LEADERBOARD } from "./initialData";

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Reusable helper that automatically retries an asynchronous database operation.
 * It will retry up to `retries` times, waiting `delayMs` between attempts.
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 1000): Promise<T> {
  let lastError: any;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        console.warn(`Database operation failed. Retrying in ${delayMs}ms (attempt ${attempt}/${retries})...`, err);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError;
}

// Fetch all events from Firestore. If Firestore is empty, seed it with sample events.
export async function dbFetchEvents(): Promise<TournamentEvent[]> {
  try {
    return await withRetry(async () => {
      const colRef = collection(db, "events");
      const snapshot = await getDocs(colRef);
      
      if (snapshot.empty) {
        console.log("No events found in firestore. Seeding INITIAL_TOURNAMENTS...");
        for (const t of INITIAL_TOURNAMENTS) {
          try {
            await setDoc(doc(db, "events", t.id), t);
          } catch (seedErr) {
            console.warn("Seeding event skipped (no write permission):", t.id, seedErr);
          }
        }
        return INITIAL_TOURNAMENTS;
      }
      
      const events: TournamentEvent[] = [];
      snapshot.forEach((doc) => {
        events.push(doc.data() as TournamentEvent);
      });
      return events;
    });
  } catch (error) {
    console.error("Error fetching events from Firestore after retries:", error);
    handleFirestoreError(error, OperationType.GET, "events");
  }
}

// Add a brand new event (Admin)
export async function dbAddEvent(event: TournamentEvent): Promise<void> {
  try {
    await setDoc(doc(db, "events", event.id), event);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `events/${event.id}`);
  }
}

// Update Event status/data
export async function dbUpdateEvent(eventId: string, updates: Partial<TournamentEvent>): Promise<void> {
  try {
    const docRef = doc(db, "events", eventId);
    await updateDoc(docRef, updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `events/${eventId}`);
  }
}

// Fetch global leaderboard. Seed if empty.
export async function dbFetchLeaderboard(): Promise<LeaderboardRank[]> {
  try {
    return await withRetry(async () => {
      const colRef = collection(db, "leaderboards");
      const snapshot = await getDocs(colRef);
      
      if (snapshot.empty) {
        console.log("No high scores found in firestore. Seeding INITIAL_LEADERBOARD...");
        for (const r of INITIAL_LEADERBOARD) {
          try {
            await setDoc(doc(db, "leaderboards", r.id), r);
          } catch (seedErr) {
            console.warn("Seeding leaderboard skipped (no write permission):", r.id, seedErr);
          }
        }
        return INITIAL_LEADERBOARD;
      }
      
      // Fetch profiles map to overlay real-time avatars & custom usernames
      let profileMap = new Map<string, { username: string; avatar: string }>();
      try {
        const userProfilesRef = collection(db, "userProfiles");
        const profilesSnapshot = await getDocs(userProfilesRef);
        profilesSnapshot.forEach((doc) => {
          const p = doc.data();
          if (p.uid) {
            profileMap.set(p.uid, { username: p.username || "", avatar: p.avatar || "" });
          }
        });
      } catch (err) {
        console.warn("Skipped dynamic profile mapping of leaderboard:", err);
      }

      const ranks: LeaderboardRank[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as LeaderboardRank;
        const matched = data.userId ? profileMap.get(data.userId) : null;
        ranks.push({
          ...data,
          username: matched?.username || data.username,
          avatar: matched?.avatar || data.avatar || ""
        });
      });
      
      // Sort descending by points
      return ranks.sort((a, b) => b.points - a.points).map((item, index) => ({
        ...item,
        rank: index + 1
      }));
    });
  } catch (error) {
    console.error("Error fetching leaderboard after retries:", error);
    handleFirestoreError(error, OperationType.GET, "leaderboards");
  }
}

// Real-time listener for the leaderboard. Updates instantly on the UI without page refresh!
export function dbSubscribeLeaderboard(callback: (ranks: LeaderboardRank[]) => void): () => void {
  const colRef = collection(db, "leaderboards");
  
  const unsubscribe = onSnapshot(colRef, async (snapshot) => {
    try {
      if (snapshot.empty) {
        // Fallback to fetch and seed
        dbFetchLeaderboard().then((ranks) => {
          if (ranks) callback(ranks);
        });
        return;
      }
      
      // Fetch profiles map to overlay real-time avatars & custom usernames
      let profileMap = new Map<string, { username: string; avatar: string }>();
      try {
        const userProfilesRef = collection(db, "userProfiles");
        const profilesSnapshot = await getDocs(userProfilesRef);
        profilesSnapshot.forEach((doc) => {
          const p = doc.data();
          if (p.uid) {
            profileMap.set(p.uid, { username: p.username || "", avatar: p.avatar || "" });
          }
        });
      } catch (err) {
        console.warn("Skipped dynamic profile mapping of leaderboard subscription:", err);
      }

      const ranks: LeaderboardRank[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as LeaderboardRank;
        const matched = data.userId ? profileMap.get(data.userId) : null;
        ranks.push({
          ...data,
          username: matched?.username || data.username,
          avatar: matched?.avatar || data.avatar || ""
        });
      });
      
      // Sort descending by points
      const sorted = ranks.sort((a, b) => b.points - a.points).map((item, index) => ({
        ...item,
        rank: index + 1
      }));
      
      callback(sorted);
    } catch (err) {
      console.error("Error in leaderboard subscribe snapshot handler:", err);
      handleFirestoreError(err, OperationType.GET, "leaderboards");
    }
  }, (error) => {
    console.error("Error in leaderboard subscription listener:", error);
    handleFirestoreError(error, OperationType.GET, "leaderboards");
  });

  return unsubscribe;
}

// Manage/Sync User Profiles
export async function dbGetUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    return await withRetry(async () => {
      const docRef = doc(db, "users", uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as UserProfile;
      }
      return null;
    });
  } catch (error) {
    console.error("Error getting user profile after retries:", error);
    handleFirestoreError(error, OperationType.GET, `users/${uid}`);
  }
}

export async function dbSaveUserProfile(profile: UserProfile): Promise<void> {
  try {
    await setDoc(doc(db, "users", profile.uid), profile);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${profile.uid}`);
  }
}

// Subscribe to real-time user profile updates (walletBalance, verification, etc.)
export function dbSubscribeUserProfile(uid: string, callback: (profile: UserProfile) => void): () => void {
  const docRef = doc(db, "users", uid);
  const unsubscribe = onSnapshot(docRef, (docSnap) => {
    try {
      if (docSnap.exists()) {
        callback(docSnap.data() as UserProfile);
      }
    } catch (err) {
      console.error("Error processing user profile snapshot:", err);
    }
  }, (error) => {
    console.error("Error subscribing to user profile:", error);
    handleFirestoreError(error, OperationType.GET, `users/${uid}`);
  });
  return unsubscribe;
}

// Register for tournament
export async function dbRegisterForTournament(reg: EventRegistration): Promise<void> {
  try {
    // Save registration document
    await setDoc(doc(db, "registrations", reg.id), reg);
    
    // Increment tournament filled slots
    const eventRef = doc(db, "events", reg.eventId);
    await updateDoc(eventRef, {
      slotsFilled: increment(1)
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `registrations/${reg.id}`);
  }
}

// Fetch registrations
export async function dbFetchRegistrations(userId?: string): Promise<EventRegistration[]> {
  try {
    return await withRetry(async () => {
      const colRef = collection(db, "registrations");
      let q = query(colRef);
      if (userId) {
        q = query(colRef, where("userId", "==", userId));
      }
      const snapshot = await getDocs(q);
      const regs: EventRegistration[] = [];
      snapshot.forEach((doc) => {
        regs.push(doc.data() as EventRegistration);
      });
      return regs;
    });
  } catch (error) {
    console.error("Error fetching registrations after retries:", error);
    handleFirestoreError(error, OperationType.GET, "registrations");
  }
}

// Fetch withdrawals
export async function dbFetchWithdrawals(userId?: string): Promise<WithdrawalRequest[]> {
  try {
    return await withRetry(async () => {
      const colRef = collection(db, "withdrawals");
      let q = query(colRef, orderBy("createdAt", "desc"));
      if (userId) {
        q = query(colRef, where("userId", "==", userId));
      }
      const snapshot = await getDocs(q);
      const withdrawals: WithdrawalRequest[] = [];
      snapshot.forEach((doc) => {
        withdrawals.push(doc.data() as WithdrawalRequest);
      });
      return withdrawals;
    });
  } catch (err) {
    console.error("Error fetching withdrawals:", err);
    const isPermissionError = err instanceof Error && (err.message.includes("permission") || err.message.includes("Permission") || (err as any).code === "permission-denied");
    if (isPermissionError) {
      handleFirestoreError(err, OperationType.GET, "withdrawals");
    }
    // Dynamic fallback when orderby fails due to index provisioning latencies
    try {
      return await withRetry(async () => {
        const snapshotNoOrder = await getDocs(collection(db, "withdrawals"));
        const list: WithdrawalRequest[] = [];
        snapshotNoOrder.forEach((doc) => {
          const d = doc.data() as WithdrawalRequest;
          if (!userId || d.userId === userId) {
            list.push(d);
          }
        });
        return list;
      });
    } catch (fallbackErr) {
      handleFirestoreError(fallbackErr, OperationType.GET, "withdrawals");
    }
  }
}

// Request withdrawal
export async function dbSubmitWithdrawal(req: WithdrawalRequest): Promise<void> {
  try {
    await setDoc(doc(db, "withdrawals", req.id), req);
    
    // Deduct/Freeze from user's active wallet balance (simulated)
    const userRef = doc(db, "users", req.userId);
    await updateDoc(userRef, {
      walletBalance: increment(-req.amount)
    });

    // Record wallet transaction history Log
    await dbRecordWalletTransaction(
      req.userId,
      "withdrawal",
      req.amount,
      `Requested cashout via UPI: ${req.upi}`,
      "pending"
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `withdrawals/${req.id}`);
  }
}

// Process withdrawal (Admin)
export async function dbProcessWithdrawal(withdrawalId: string, status: "approved" | "rejected", userId: string, amount: number): Promise<void> {
  try {
    await updateDoc(doc(db, "withdrawals", withdrawalId), { status });
    
    // If rejected, refund the wallet balance back
    if (status === "rejected") {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        walletBalance: increment(amount)
      });

      // Record rejection transaction refund Log
      await dbRecordWalletTransaction(
        userId,
        "withdrawal",
        amount,
        `Rejected cashout refund: ID ${withdrawalId}`,
        "rejected"
      );
    } else if (status === "approved") {
      // Record approved cashout
      await dbRecordWalletTransaction(
        userId,
        "withdrawal",
        amount,
        `Processed secure cashout: ID ${withdrawalId}`,
        "completed"
      );
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `withdrawals/${withdrawalId}`);
  }
}

// Fetch notifications
export async function dbFetchNotifications(userId: string): Promise<InAppNotification[]> {
  try {
    return await withRetry(async () => {
      const colRef = collection(db, "notifications");
      const q = query(colRef, where("userId", "==", userId));
      const snapshot = await getDocs(q);
      const notices: InAppNotification[] = [];
      snapshot.forEach((doc) => {
        notices.push(doc.data() as InAppNotification);
      });
      return notices.sort((a,b) => b.createdAt.localeCompare(a.createdAt));
    });
  } catch (error) {
    console.error("Error fetching notifications after retries:", error);
    handleFirestoreError(error, OperationType.GET, "notifications");
  }
}

// Write custom notification
export async function dbAddNotification(notice: InAppNotification): Promise<void> {
  try {
    await setDoc(doc(db, "notifications", notice.id), notice);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `notifications/${notice.id}`);
  }
}

// Fetch all registered users (Admin only)
export async function dbFetchAllUsers(): Promise<UserProfile[]> {
  try {
    return await withRetry(async () => {
      const colRef = collection(db, "users");
      const snapshot = await getDocs(colRef);
      const users: UserProfile[] = [];
      snapshot.forEach((doc) => {
        users.push(doc.data() as UserProfile);
      });
      return users;
    });
  } catch (error) {
    console.error("Error fetching all users after retries:", error);
    handleFirestoreError(error, OperationType.GET, "users");
  }
}

// Admin modification of raw user profile details
export async function dbAdminUpdateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
  try {
    const docRef = doc(db, "users", userId);
    await updateDoc(docRef, updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
  }
}

// Update individual event registration with rank/winnings
export async function dbUpdateRegistration(regId: string, updates: Partial<EventRegistration>): Promise<void> {
  try {
    const docRef = doc(db, "registrations", regId);
    await updateDoc(docRef, updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `registrations/${regId}`);
  }
}

// Real-time Match Chat Room Functions
export function dbSubscribeMatchMessages(eventId: string, callback: (messages: MatchMessage[]) => void): () => void {
  const colRef = collection(db, "matchMessages");
  const q = query(colRef, where("eventId", "==", eventId));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    try {
      const messages: MatchMessage[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as MatchMessage;
        messages.push({
          ...data,
          id: doc.id
        });
      });
      // Sort messages in-memory by createdAt to bypass compound indexing constraints in Firestore
      const sorted = messages.sort((a, b) => {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
      callback(sorted);
    } catch (err) {
      console.error("Error parsing match messages snapshot:", err);
    }
  }, (error) => {
    console.error("Error subscribing to match messages:", error);
  });

  return unsubscribe;
}

export async function dbSendMatchMessage(eventId: string, text: string, user: UserProfile): Promise<void> {
  try {
    const colRef = collection(db, "matchMessages");
    const payload: Omit<MatchMessage, "id"> = {
      eventId,
      userId: user.uid,
      username: user.username,
      avatar: user.avatar || "",
      text,
      createdAt: new Date().toISOString()
    };
    const docRef = await addDoc(colRef, payload);
    await updateDoc(doc(db, "matchMessages", docRef.id), { id: docRef.id });
  } catch (err) {
    console.error("Error saving match message to Firestore:", err);
    handleFirestoreError(err, OperationType.CREATE, "matchMessages");
  }
}

// Subscribe to real-time wallet transactions
export function dbSubscribeWalletTransactions(userId: string, callback: (transactions: WalletTransaction[]) => void): () => void {
  const colRef = collection(db, "walletTransactions");
  const q = query(colRef, where("userId", "==", userId));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    try {
      const list: WalletTransaction[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as WalletTransaction;
        list.push({
          ...data,
          id: doc.id
        });
      });
      // Sort descending by date (createdAt) so newest shows first
      const sorted = list.sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      callback(sorted);
    } catch (err) {
      console.error("Error parsing wallet transaction snapshot:", err);
    }
  }, (error) => {
    console.error("Error subscribing to wallet transactions:", error);
  });

  return unsubscribe;
}

// Record a new wallet transaction
export async function dbRecordWalletTransaction(
  userId: string,
  type: "addition" | "deduction" | "payout" | "withdrawal",
  amount: number,
  description: string,
  status: "completed" | "pending" | "rejected" = "completed"
): Promise<void> {
  try {
    const colRef = collection(db, "walletTransactions");
    const payload: Omit<WalletTransaction, "id"> = {
      userId,
      type,
      amount,
      description,
      status,
      createdAt: new Date().toISOString()
    };
    const docRef = await addDoc(colRef, payload);
    await updateDoc(doc(db, "walletTransactions", docRef.id), { id: docRef.id });
  } catch (err) {
    console.error("Error recording wallet transaction:", err);
    handleFirestoreError(err, OperationType.CREATE, "walletTransactions");
  }
}

// Subscribes to real-time MVP votes cast for a specific event
export function dbSubscribeMvpVotes(eventId: string, callback: (votes: any[]) => void): () => void {
  const colRef = collection(db, "mvpVotes");
  const q = query(colRef, where("eventId", "==", eventId));
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    try {
      const votes: any[] = [];
      snapshot.forEach((doc) => {
        votes.push({
          id: doc.id,
          ...doc.data()
        });
      });
      callback(votes);
    } catch (err) {
      console.error("Error in dbSubscribeMvpVotes snapshot handler:", err);
    }
  }, (error) => {
    console.error("Error in dbSubscribeMvpVotes listener:", error);
  });
  
  return unsubscribe;
}

// Casts an MVP vote and increments nominee's MVP points in leaderboards
export async function dbCastMvpVote(
  eventId: string,
  voterUserId: string,
  nomineeUserId: string,
  nomineeUsername: string
): Promise<void> {
  const voteDocId = `${eventId}_${voterUserId}`;
  try {
    const voteRef = doc(db, "mvpVotes", voteDocId);
    
    // 1. Record the vote in Firestore
    await setDoc(voteRef, {
      id: voteDocId,
      eventId,
      voterUserId,
      nomineeUserId,
      nomineeUsername,
      createdAt: new Date().toISOString()
    });
    
    // 2. Increment nominee's mvpPoints in 'leaderboards'
    const leaderboardsRef = collection(db, "leaderboards");
    const q = query(leaderboardsRef, where("userId", "==", nomineeUserId));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const docId = snapshot.docs[0].id;
      const docRef = doc(db, "leaderboards", docId);
      await updateDoc(docRef, {
        mvpPoints: increment(1)
      });
    } else {
      const newRankId = `rank-${nomineeUserId}`;
      const newRankDoc = doc(db, "leaderboards", newRankId);
      await setDoc(newRankDoc, {
        id: newRankId,
        userId: nomineeUserId,
        username: nomineeUsername,
        points: 0,
        wins: 0,
        earnings: 0,
        kills: 0,
        mvpPoints: 1,
        platform: "Mobile",
        region: "India"
      });
    }
  } catch (err) {
    console.error("Error casting MVP vote:", err);
    handleFirestoreError(err, OperationType.WRITE, `mvpVotes/${voteDocId}`);
  }
}



