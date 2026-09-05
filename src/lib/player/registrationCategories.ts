/**
 * Direct port of the category data hard-coded in sports-mobile-main/src/
 * screens/player/EventRegistration.tsx. These are business rules (real
 * competition category/weight-class definitions), not UI -- copied exactly,
 * not redesigned.
 */
export interface Category {
  key: string;
  label: string;
}

export const TANDING_AGE_CATEGORIES: Category[] = [
  { key: 'Senior', label: 'Senior Tanding (17 to 45 years)' },
  { key: 'Junior', label: 'Junior Tanding (14 to 16 years)' },
  { key: 'Pre-Junior', label: 'Pre Junior Tanding (12 to 13 years)' },
  { key: 'Pre-Teen', label: 'Pre Teen Tanding (10 to 11 years)' },
  { key: 'Singa', label: 'Singa Tanding (3 to 6 years)' },
  { key: 'Maccan', label: 'Maccan Tanding (7 to 9 years)' },
  { key: 'Master-1', label: 'Master-1 Tanding (46 to 60 years)' },
  { key: 'Master-2', label: 'Master-2 Tanding (61 years and above)' },
];

export const SENI_AGE_CATEGORIES: Category[] = [
  { key: 'Senior', label: 'Senior (17 to 45 years)' },
  { key: 'Junior', label: 'Junior (14 to 16 years)' },
  { key: 'Pre-Junior', label: 'Pre Junior (12 to 13 years)' },
  { key: 'Pre-Teen', label: 'Pre Teen (10 to 11 years)' },
  { key: 'Singa', label: 'Singa (3 to 6 years)' },
  { key: 'Maccan', label: 'Maccan (7 to 9 years)' },
  { key: 'Master-1', label: 'Master-1 (46 to 60 years)' },
  { key: 'Master-2', label: 'Master-2 (61 years and above)' },
];

export const WEIGHT_CATEGORIES_BY_AGE: Record<string, Category[]> = {
  Senior: [
    { key: 'U45', label: 'Under 45Kg' },
    { key: 'A', label: 'Class A 45 - 50 Kg' },
    { key: 'B', label: 'Class B 50 - 55 Kg' },
    { key: 'C', label: 'Class C 55 - 60 Kg' },
    { key: 'D', label: 'Class D 60 - 65 Kg' },
    { key: 'E', label: 'Class E 65 - 70 Kg' },
    { key: 'F', label: 'Class F 70 - 75 Kg' },
    { key: 'G', label: 'Class G 75 - 80 Kg' },
    { key: 'H', label: 'Class H 80 - 85 Kg' },
    { key: 'I', label: 'Class I 85 - 90 Kg [NOT FOR FEMALE]' },
    { key: 'J', label: 'Class J 90 - 95 Kg [NOT FOR FEMALE]' },
    { key: 'OPEN1', label: 'Class OPEN 1 95 - 110 Kg ; Female 85 - 100 Kg' },
    { key: 'OPEN2', label: 'Class OPEN 2 Above 110 Kg ; Female Above 100 Kg' },
  ],
  Junior: [
    { key: 'U39', label: 'Under 39Kg' },
    { key: 'A', label: 'Class A 39 - 43 Kg' },
    { key: 'B', label: 'Class B 43 - 47 Kg' },
    { key: 'C', label: 'Class C 47 - 51 Kg' },
    { key: 'D', label: 'Class D 51 - 55 Kg' },
    { key: 'E', label: 'Class E 55 - 59 Kg' },
    { key: 'F', label: 'Class F 59 - 63 Kg' },
    { key: 'G', label: 'Class G 63 - 67 Kg' },
    { key: 'H', label: 'Class H 67 - 71 Kg' },
    { key: 'I', label: 'Class I 71 - 75 Kg' },
    { key: 'J', label: 'Class J 75 - 79 Kg' },
    { key: 'K', label: 'Class K 79 - 83 Kg [Not Applicable for Female]' },
    { key: 'L', label: 'Class L 83 - 87 Kg [Not Applicable for Female]' },
    { key: 'OPEN1', label: 'Class OPEN 1 87 - 100 Kg ; For Female 79 - 92 Kg' },
    { key: 'OPEN2', label: 'Class OPEN 2 Above 100 Kg ; For Female Above 92 Kg' },
  ],
  'Pre-Junior': [
    { key: 'A', label: 'Class A 30 - 33 Kg' },
    { key: 'B', label: 'Class B 33 - 36 Kg' },
    { key: 'C', label: 'Class C 36 - 39 Kg' },
    { key: 'D', label: 'Class D 39 - 42 Kg' },
    { key: 'E', label: 'Class E 42 - 45 Kg' },
    { key: 'F', label: 'Class F 45 - 48 Kg' },
    { key: 'G', label: 'Class G 48 - 51 Kg' },
    { key: 'H', label: 'Class H 51 - 54 Kg' },
    { key: 'I', label: 'Class I 54 - 57 Kg' },
    { key: 'J', label: 'Class J 57 - 60 Kg' },
    { key: 'K', label: 'Class K 60 - 63 Kg' },
    { key: 'L', label: 'Class L 63 - 66 Kg' },
    { key: 'M', label: 'Class M 66 - 69 Kg' },
    { key: 'N', label: 'Class N 69 - 72 Kg' },
    { key: 'O', label: 'Class O 72 - 75 Kg' },
    { key: 'P', label: 'Class P 75 - 78 Kg' },
    { key: 'OPEN', label: 'Class OPEN 78 - 84 Kg' },
  ],
  'Pre-Teen': [
    { key: 'A', label: 'Class A 26 - 28 Kg' },
    { key: 'B', label: 'Class B 28 - 30 Kg' },
    { key: 'C', label: 'Class C 30 - 32 Kg' },
    { key: 'D', label: 'Class D 32 - 34 Kg' },
    { key: 'E', label: 'Class E 34 - 36 Kg' },
    { key: 'F', label: 'Class F 36 - 38 Kg' },
    { key: 'G', label: 'Class G 38 - 40 Kg' },
    { key: 'H', label: 'Class H 40 - 42 Kg' },
    { key: 'I', label: 'Class I 42 - 44 Kg' },
    { key: 'J', label: 'Class J 44 - 46 Kg' },
    { key: 'K', label: 'Class K 46 - 48 Kg' },
    { key: 'L', label: 'Class L 48 - 50 Kg' },
    { key: 'M', label: 'Class M 50 - 52 Kg' },
    { key: 'N', label: 'Class N 52 - 54 Kg' },
    { key: 'O', label: 'Class O 54 - 56 Kg' },
    { key: 'P', label: 'Class P 56 - 58 Kg' },
    { key: 'Q', label: 'Class Q 58 - 60 Kg' },
    { key: 'R', label: 'Class R 60 - 62 Kg' },
    { key: 'S', label: 'Class S 62 - 64 Kg' },
    { key: 'OPEN', label: 'OPEN Class 64 - 68 Kg' },
  ],
};
WEIGHT_CATEGORIES_BY_AGE['Master-1'] = WEIGHT_CATEGORIES_BY_AGE['Senior'];
WEIGHT_CATEGORIES_BY_AGE['Master-2'] = WEIGHT_CATEGORIES_BY_AGE['Senior'];

export const SIMPLE_WEIGHT_AGES = ['Singa', 'Maccan'];

export const SENI_CATEGORIES: Category[] = [
  { key: 'Tunggal', label: 'TUNGGAL' },
  { key: 'Solo', label: 'SOLO' },
  { key: 'Ganda-P1', label: 'GANDA [PLAYER-1]' },
  { key: 'Ganda-P2', label: 'GANDA [PLAYER-2]' },
  { key: 'Regu-P1', label: 'REGU [PLAYER-1]' },
  { key: 'Regu-P2', label: 'REGU [PLAYER-2]' },
  { key: 'Regu-P3', label: 'REGU [PLAYER-3]' },
];
