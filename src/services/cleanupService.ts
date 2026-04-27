import { Match, Player, Contest } from '../types';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  deleteDoc, 
  doc, 
  writeBatch 
} from 'firebase/firestore';

/**
 * Deletes all data related to matches that finished more than 8 hours ago.
 * This helps save Firestore cloud space.
 */
export async function cleanupOldMatches() {
  console.log("Starting cleanup of old matches (8hr threshold)...");
  
  const CLEANUP_THRESHOLD_MS = 8 * 60 * 60 * 1000; // 8 hours
  const now = new Date().getTime();
  
  try {
    const matchesRef = collection(db, 'matches');
    const q = query(matchesRef, where('status', '==', 'completed'));
    const querySnapshot = await getDocs(q);
    
    let deletedCount = 0;
    
    for (const matchDoc of querySnapshot.docs) {
      const match = matchDoc.data() as Match;
      const matchDate = new Date(match.date).getTime();
      
      const matchStartTime = matchDate;
      const matchEndTimeEstimate = matchStartTime + (4 * 60 * 60 * 1000); 
      
      if (now - matchEndTimeEstimate > CLEANUP_THRESHOLD_MS) {
        console.log(`Cleaning up old match: ${match.team1} vs ${match.team2} (${match.id})`);
        
        let batch = writeBatch(db);
        let opCount = 0;

        const commitIfNeeded = async () => {
          if (opCount >= 400) {
            await batch.commit();
            batch = writeBatch(db);
            opCount = 0;
          }
        };
        
        // 1. Delete user teams for this match
        const userTeamsRef = collection(db, 'userTeams');
        const userTeamsQ = query(userTeamsRef, where('matchId', '==', matchDoc.id));
        const userTeamsSnap = await getDocs(userTeamsQ);
        for (const tDoc of userTeamsSnap.docs) {
           batch.delete(tDoc.ref);
           opCount++;
           await commitIfNeeded();
        }

        // 2. Delete contests and their entries
        const contestsRef = collection(db, 'contests');
        const contestsQ = query(contestsRef, where('matchId', '==', matchDoc.id));
        const contestsSnap = await getDocs(contestsQ);
        for (const cDoc of contestsSnap.docs) {
            const entriesRef = collection(db, 'contests', cDoc.id, 'entries');
            const entriesSnap = await getDocs(entriesRef);
            for (const eDoc of entriesSnap.docs) {
               batch.delete(eDoc.ref);
               opCount++;
               await commitIfNeeded();
            }
            
            batch.delete(cDoc.ref);
            opCount++;
            await commitIfNeeded();
        }
        
        // 3. Delete the match fixture
        batch.delete(matchDoc.ref);
        opCount++;
        
        await batch.commit();
        deletedCount++;
      }
    }
    
    if (deletedCount > 0) {
      console.log(`Cleanup complete. Deleted ${deletedCount} old matches and associated user data.`);
    } else {
      console.log("No old matches requiring cleanup.");
    }
    
  } catch (error) {
    console.error("Cleanup service error:", error);
  }
}
