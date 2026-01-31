/**
 * Firestore Migration Script - Location Data Normalization
 * 
 * This script migrates existing kitchen and student documents to include
 * normalized location data alongside display values.
 * 
 * Run this ONCE to fix existing data inconsistencies.
 * 
 * Usage: node migrateLocationData.js
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';

// Import your Firebase config
// Replace with your actual config path
const firebaseConfig = {
    // Your Firebase configuration here
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Normalizes a location string for consistent storage and comparison
 */
const normalizeLocation = (location) => {
    if (!location || typeof location !== 'string') return '';

    return location
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
};

/**
 * Migrate kitchen documents
 */
const migrateKitchens = async () => {
    console.log('🔄 Starting kitchen migration...');

    const kitchensRef = collection(db, 'kitchens');
    const snapshot = await getDocs(kitchensRef);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const docSnap of snapshot.docs) {
        try {
            const kitchen = docSnap.data();
            const address = kitchen.address || {};

            // Check if already migrated
            if (address.city && address.cityDisplay && address.state && address.stateDisplay) {
                console.log(`⏭️  Skipping ${kitchen.name} - already migrated`);
                skipped++;
                continue;
            }

            // Prepare update data
            const updates = {};

            // Migrate city
            if (address.city) {
                const originalCity = address.cityDisplay || address.city;
                updates['address.city'] = normalizeLocation(originalCity);
                updates['address.cityDisplay'] = originalCity.trim();
            }

            // Migrate state
            if (address.state) {
                const originalState = address.stateDisplay || address.state;
                updates['address.state'] = normalizeLocation(originalState);
                updates['address.stateDisplay'] = originalState.trim();
            } else {
                // If no state exists, try to infer from city (manual review needed)
                console.log(`⚠️  Kitchen ${kitchen.name} has no state - manual review needed`);
            }

            // Update document
            if (Object.keys(updates).length > 0) {
                await updateDoc(doc(db, 'kitchens', docSnap.id), updates);
                console.log(`✅ Updated kitchen: ${kitchen.name}`);
                updated++;
            }
        } catch (error) {
            console.error(`❌ Error updating kitchen ${docSnap.id}:`, error);
            errors++;
        }
    }

    console.log(`\n📊 Kitchen Migration Summary:`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Errors: ${errors}`);
    console.log(`   Total: ${snapshot.size}\n`);
};

/**
 * Migrate student documents
 */
const migrateStudents = async () => {
    console.log('🔄 Starting student migration...');

    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const docSnap of snapshot.docs) {
        try {
            const user = docSnap.data();

            // Only migrate students with city data
            if (!user.city || user.role !== 'student') {
                skipped++;
                continue;
            }

            // Check if already migrated
            if (user.cityDisplay) {
                console.log(`⏭️  Skipping user ${user.name || docSnap.id} - already migrated`);
                skipped++;
                continue;
            }

            // Prepare update data
            const updates = {};

            // Migrate city
            const originalCity = user.city;
            updates.city = normalizeLocation(originalCity);
            updates.cityDisplay = originalCity.trim();

            // Update document
            await updateDoc(doc(db, 'users', docSnap.id), updates);
            console.log(`✅ Updated student: ${user.name || docSnap.id}`);
            updated++;
        } catch (error) {
            console.error(`❌ Error updating user ${docSnap.id}:`, error);
            errors++;
        }
    }

    console.log(`\n📊 Student Migration Summary:`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Errors: ${errors}`);
    console.log(`   Total: ${snapshot.size}\n`);
};

/**
 * Run migration
 */
const runMigration = async () => {
    console.log('🚀 Starting Location Data Normalization Migration\n');
    console.log('⚠️  WARNING: This will update existing Firestore documents.');
    console.log('   Make sure you have a backup before proceeding.\n');

    try {
        await migrateKitchens();
        await migrateStudents();

        console.log('✅ Migration completed successfully!');
        console.log('\n📝 Next Steps:');
        console.log('   1. Review any kitchens with missing state data');
        console.log('   2. Test the Discovery screen filtering');
        console.log('   3. Verify kitchen and student profiles display correctly\n');
    } catch (error) {
        console.error('❌ Migration failed:', error);
    }

    process.exit(0);
};

// Run the migration
runMigration();
