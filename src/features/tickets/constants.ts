/** Staffing "Type of Staff" options (value → title + auto salary range). */
export const STAFF_TYPES: Array<{ value: number; label: string; salary: string }> = [
  { value: 35, label: "Male Unisex Stylist", salary: "28K to 30K + Food Allowances" },
  { value: 36, label: "Male Hairstylist", salary: "20K to 22K + Food Allowances" },
  { value: 37, label: "Female Beautician", salary: "20K to 22K + Food Allowances" },
  { value: 38, label: "Female Beauty & Makeup", salary: "30K & Above + Food Allowances" },
  { value: 39, label: "Spa + Beauty (F)", salary: "20K to 22K + Food Allowances" },
  { value: 40, label: "Spa + Beauty (M)", salary: "20K to 22K + Food Allowances" },
  { value: 41, label: "Male Hair & Beauty", salary: "20K to 22K + Food Allowances" },
  { value: 42, label: "Spa Therapist for Men", salary: "20K to 22K + Food Allowances" },
  { value: 43, label: "Spa Therapist for Women", salary: "20K to 22K + Food Allowances" },
  { value: 44, label: "Academy Fresher Beauty", salary: "8K to 12K + Food Allowances" },
  { value: 46, label: "Academy Fresher Spa", salary: "12K to 15K + Food Allowances" },
];

export const STAFF_LEVELS = [
  { value: "junior", label: "Junior" },
  { value: "mid_level", label: "Mid Level" },
  { value: "senior", label: "Senior" },
];

export const TRAINING_FOR = [
  { value: "skin", label: "Skin" },
  { value: "spa", label: "Spa" },
  { value: "hair", label: "Hair" },
  { value: "make_up", label: "Make-up" },
  { value: "front_office", label: "Front Office" },
  { value: "experience_sop", label: "Experience SOP" },
  { value: "soft_skills", label: "Soft Skills" },
];

/** Staff Exit designations (value → title). */
export const DESIGNATIONS: Array<{ value: number; label: string }> = [
  { value: 1, label: "Hair Stylist" },
  { value: 2, label: "Spa Therapist" },
  { value: 3, label: "Basic Makeup Artist" },
  { value: 4, label: "Advanced Makeup Artist" },
  { value: 5, label: "Nail Artist" },
  { value: 7, label: "Front Desk Executive" },
  { value: 9, label: "Beautician" },
  { value: 10, label: "Pedicurist" },
  { value: 11, label: "All Rounder" },
];

export const designationLabel = (v?: number) => DESIGNATIONS.find((d) => d.value === v)?.label ?? (v ?? "—");
