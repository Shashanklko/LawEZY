/**
 * Generates a unique LawEZY UID based on specific business logic:
 * MM (Month 1st two letters) + XX (Random Number) + SH (Name 1st two letters) + Role Suffix
 */
export const generateLawEZYUID = (user) => {
    if (!user) return 'PENDING-UID';

    // 1. Month (e.g., APRIL -> AP)
    const monthNames = ["JA", "FE", "MA", "AP", "MY", "JN", "JL", "AU", "SE", "OC", "NO", "DE"];
    const currentMonth = monthNames[new Date().getMonth()];

    // 2. Random Number (00-99)
    // For a real app, this should be derived from the DB ID or persistent salt
    const randomSeed = user.id ? parseInt(user.id.substring(0, 2), 16) % 100 : Math.floor(Math.random() * 90) + 10;
    const XX = randomSeed.toString().padStart(2, '0');

    // 3. Name Prefix (First two letters of first name)
    const nameToUse = user.firstName || user.firstname || 'USER';
    const SH = nameToUse.substring(0, 2).toUpperCase();

    // 4. Role Suffix
    let suffix = 'CL'; // Default Client
    const role = user.role?.toUpperCase();
    if (role === 'LAWYER') suffix = 'LW';
    else if (role === 'CA') suffix = 'CA';
    else if (role === 'CFA') suffix = 'CF';
    else if (role === 'OTHER' || role === 'PRO' || role === 'EXPERT') suffix = 'LW'; // Map expert to LW or generic

    return `${currentMonth}${XX}${SH}${suffix}`;
};
