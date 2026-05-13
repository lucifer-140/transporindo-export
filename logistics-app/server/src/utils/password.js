import bcrypt from 'bcrypt';

const COST = 12;

export const hash = (plain) => bcrypt.hash(plain, COST);
export const verify = (plain, hashed) => bcrypt.compare(plain, hashed);
