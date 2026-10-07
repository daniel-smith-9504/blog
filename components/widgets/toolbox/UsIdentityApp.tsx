"use client";

import { useState, useCallback } from "react";

const FIRST_NAMES_MALE = [
  "James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph", "Thomas", "Charles",
  "Christopher", "Daniel", "Matthew", "Anthony", "Mark", "Donald", "Steven", "Paul", "Andrew", "Joshua",
  "Kenneth", "Kevin", "Brian", "George", "Timothy", "Ronald", "Edward", "Jason", "Jeffrey", "Ryan",
  "Jacob", "Gary", "Nicholas", "Eric", "Jonathan", "Stephen", "Larry", "Justin", "Scott", "Brandon",
  "Benjamin", "Samuel", "Gregory", "Alexander", "Frank", "Patrick", "Raymond", "Jack", "Dennis", "Jerry"
];

const FIRST_NAMES_FEMALE = [
  "Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Barbara", "Susan", "Jessica", "Sarah", "Karen",
  "Nancy", "Lisa", "Betty", "Margaret", "Sandra", "Ashley", "Kimberly", "Emily", "Donna", "Michelle",
  "Dorothy", "Carol", "Amanda", "Melissa", "Deborah", "Stephanie", "Rebecca", "Laura", "Sharon", "Cynthia",
  "Kathleen", "Amy", "Shirley", "Angela", "Helen", "Anna", "Brenda", "Pamela", "Nicole", "Emma",
  "Samantha", "Katherine", "Christine", "Debra", "Rachel", "Catherine", "Carolyn", "Janet", "Ruth", "Maria"
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
  "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
  "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson",
  "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
  "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell", "Carter", "Roberts"
];

const STREET_NAMES = [
  "Main", "Oak", "Pine", "Maple", "Cedar", "Elm", "Washington", "Lake", "Hill", "Park",
  "Chestnut", "Walnut", "Spruce", "Willow", "Dogwood", "Magnolia", "Birch", "Poplar", "Sycamore", "Ash",
  "Lincoln", "Jefferson", "Madison", "Adams", "Jackson", "Franklin", "Grant", "Hamilton", "Monroe", "Clay",
  "Broadway", "State", "Center", "Church", "College", "Market", "Front", "High", "Mill", "Spring",
  "River", "Bridge", "Railroad", "School", "Union", "Prospect", "Cherry", "Ridge", "Meadow", "Sunset"
];

const STREET_SUFFIXES = ["St", "Ave", "Blvd", "Rd", "Ln", "Dr", "Way", "Ct", "Pl", "Ter"];

const CITIES = [
  { name: "New York", state: "NY", zipPrefix: "10" },
  { name: "Los Angeles", state: "CA", zipPrefix: "90" },
  { name: "Chicago", state: "IL", zipPrefix: "60" },
  { name: "Houston", state: "TX", zipPrefix: "77" },
  { name: "Phoenix", state: "AZ", zipPrefix: "85" },
  { name: "Philadelphia", state: "PA", zipPrefix: "19" },
  { name: "San Antonio", state: "TX", zipPrefix: "78" },
  { name: "San Diego", state: "CA", zipPrefix: "92" },
  { name: "Dallas", state: "TX", zipPrefix: "75" },
  { name: "San Jose", state: "CA", zipPrefix: "95" },
  { name: "Austin", state: "TX", zipPrefix: "73" },
  { name: "Jacksonville", state: "FL", zipPrefix: "32" },
  { name: "Fort Worth", state: "TX", zipPrefix: "76" },
  { name: "Columbus", state: "OH", zipPrefix: "43" },
  { name: "Charlotte", state: "NC", zipPrefix: "28" },
  { name: "San Francisco", state: "CA", zipPrefix: "94" },
  { name: "Indianapolis", state: "IN", zipPrefix: "46" },
  { name: "Seattle", state: "WA", zipPrefix: "98" },
  { name: "Denver", state: "CO", zipPrefix: "80" },
  { name: "Washington", state: "DC", zipPrefix: "20" },
  { name: "Boston", state: "MA", zipPrefix: "02" },
  { name: "Detroit", state: "MI", zipPrefix: "48" },
  { name: "Nashville", state: "TN", zipPrefix: "37" },
  { name: "Portland", state: "OR", zipPrefix: "97" },
  { name: "Oklahoma City", state: "OK", zipPrefix: "73" },
];

const HAIR_COLORS = ["Black", "Brown", "Blonde", "Red", "Gray", "White", "Auburn"];
const EYE_COLORS = ["Brown", "Blue", "Green", "Hazel", "Gray", "Amber"];
const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const OCCUPATIONS = [
  "Software Engineer", "Teacher", "Nurse", "Sales Manager", "Accountant", "Doctor", "Lawyer",
  "Marketing Manager", "Project Manager", "Data Analyst", "Designer", "Consultant", "Writer",
  "Chef", "Police Officer", "Firefighter", "Architect", "Pharmacist", "Dentist", "Psychologist"
];
const COMPANIES = [
  "TechCorp", "Global Solutions", "American Dynamics", "NextGen Systems", "Pioneer Group",
  "Summit Enterprises", "Horizon Inc", "Atlas Corp", "Vertex Industries", "Meridian Partners",
  "Stellar Innovations", "Quantum Labs", "Fusion Media", "Catalyst Group", "Nexus Holdings"
];

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randDigits(n: number) {
  return String(randInt(10 ** (n - 1), 10 ** n - 1)).padStart(n, "0");
}

interface Identity {
  gender: string;
  firstName: string;
  lastName: string;
  fullName: string;
  title: string;
  birthday: string;
  age: number;
  hairColor: string;
  eyeColor: string;
  height: string;
  weight: string;
  bloodType: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  ssn: string;
  email: string;
  username: string;
  password: string;
  occupation: string;
  company: string;
  creditCardType: string;
  creditCardNumber: string;
  cvv: string;
  creditCardExpiry: string;
  userAgent: string;
}

function generateIdentity(): Identity {
  const gender = Math.random() > 0.5 ? "Male" : "Female";
  const firstNames = gender === "Male" ? FIRST_NAMES_MALE : FIRST_NAMES_FEMALE;
  const firstName = randItem(firstNames);
  const lastName = randItem(LAST_NAMES);
  const fullName = `${firstName} ${lastName}`;
  const title = gender === "Male" ? randItem(["Mr.", "Dr.", "Prof."]) : randItem(["Ms.", "Mrs.", "Dr.", "Prof."]);

  const birthYear = randInt(1960, 2005);
  const birthMonth = randInt(1, 12);
  const birthDay = randInt(1, 28);
  const birthday = `${birthMonth.toString().padStart(2, "0")}/${birthDay.toString().padStart(2, "0")}/${birthYear}`;
  const age = new Date().getFullYear() - birthYear;

  const cityData = randItem(CITIES);
  const street = `${randInt(100, 9999)} ${randItem(STREET_NAMES)} ${randItem(STREET_SUFFIXES)}`;
  const zipCode = `${cityData.zipPrefix}${randDigits(3)}`;
  const areaCode = randInt(200, 999);
  const phone = `(${areaCode}) ${randDigits(3)}-${randDigits(4)}`;

  const ssn = `${randDigits(3)}-${randDigits(2)}-${randDigits(4)}`;
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randInt(1, 999)}@${randItem(["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com"])}`;
  const username = `${firstName.toLowerCase()}_${lastName.toLowerCase()}${randInt(10, 99)}`;

  const creditCardType = randItem(["Visa", "MasterCard", "American Express", "Discover"]);
  let creditCardNumber = "";
  if (creditCardType === "Visa") {
    creditCardNumber = `4${randDigits(15)}`;
  } else if (creditCardType === "MasterCard") {
    creditCardNumber = `5${randInt(1, 5)}${randDigits(14)}`;
  } else if (creditCardType === "American Express") {
    creditCardNumber = `3${randItem(["4", "7"])}${randDigits(13)}`;
  } else {
    creditCardNumber = `6${randDigits(15)}`;
  }
  const cvv = creditCardType === "American Express" ? randDigits(4) : randDigits(3);
  const expiryMonth = randInt(1, 12).toString().padStart(2, "0");
  const expiryYear = randInt(26, 32);

  return {
    gender,
    firstName,
    lastName,
    fullName,
    title,
    birthday,
    age,
    hairColor: randItem(HAIR_COLORS),
    eyeColor: randItem(EYE_COLORS),
    height: `${randInt(5, 6)}'${randInt(0, 11)}"`,
    weight: `${randInt(110, 250)} lbs`,
    bloodType: randItem(BLOOD_TYPES),
    street,
    city: cityData.name,
    state: cityData.state,
    zipCode,
    phone,
    ssn,
    email,
    username,
    password: `${randItem(["Sky", "Ocean", "Fire", "Wind", "Star", "Moon", "Sun", "Cloud"])}${randInt(10, 99)}${randItem(["!", "@", "#", "$"])}`,
    occupation: randItem(OCCUPATIONS),
    company: randItem(COMPANIES),
    creditCardType,
    creditCardNumber,
    cvv,
    creditCardExpiry: `${expiryMonth}/${expiryYear}`,
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  };
}

function InfoRow({ label, value, onCopy }: { label: string; value: string; onCopy: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0 w-16">{label}</span>
      <span className="text-[11px] text-slate-700 dark:text-slate-300 flex-1 truncate text-right mr-2">{value}</span>
      <button
        type="button"
        onClick={() => onCopy(value)}
        className="text-[10px] text-indigo-500 font-bold shrink-0 hover:text-indigo-600"
      >
        复制
      </button>
    </div>
  );
}

export default function UsIdentityApp() {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"basic" | "address" | "work" | "card">("basic");

  const generate = useCallback(() => {
    setIdentity(generateIdentity());
    setCopiedField(null);
  }, []);

  const handleCopy = async (value: string, field: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1200);
    } catch {}
  };

  const handleCopyAll = async () => {
    if (!identity) return;
    const lines = [
      `姓名: ${identity.fullName}`,
      `性别: ${identity.gender}`,
      `生日: ${identity.birthday} (${identity.age}岁)`,
      `地址: ${identity.street}, ${identity.city}, ${identity.state} ${identity.zipCode}`,
      `电话: ${identity.phone}`,
      `邮箱: ${identity.email}`,
      `SSN: ${identity.ssn}`,
      `职业: ${identity.occupation}`,
      `公司: ${identity.company}`,
      `信用卡: ${identity.creditCardType} ${identity.creditCardNumber}`,
      `CVV: ${identity.cvv}  有效期: ${identity.creditCardExpiry}`,
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopiedField("all");
      setTimeout(() => setCopiedField(null), 1200);
    } catch {}
  };

  const tabs = [
    { key: "basic" as const, label: "基本信息" },
    { key: "address" as const, label: "地址" },
    { key: "work" as const, label: "工作/账号" },
    { key: "card" as const, label: "信用卡" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* 生成按钮 */}
      <button
        type="button"
        onClick={generate}
        className="w-full py-2.5 rounded-xl bg-indigo-500 text-white font-bold text-sm hover:bg-indigo-600 transition-colors mb-3"
      >
        生成美国身份
      </button>

      {identity ? (
        <>
          {/* 标签切换 */}
          <div className="flex gap-1 mb-2">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                  activeTab === t.key
                    ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/30"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* 内容区 */}
          <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-800/30 rounded-xl p-3 mb-2">
            {activeTab === "basic" && (
              <>
                <InfoRow label="姓名" value={`${identity.title} ${identity.fullName}`} onCopy={(v) => handleCopy(v, "name")} />
                <InfoRow label="性别" value={identity.gender} onCopy={(v) => handleCopy(v, "gender")} />
                <InfoRow label="生日" value={`${identity.birthday} (${identity.age}岁)`} onCopy={(v) => handleCopy(v, "birthday")} />
                <InfoRow label="发色" value={identity.hairColor} onCopy={(v) => handleCopy(v, "hair")} />
                <InfoRow label="瞳色" value={identity.eyeColor} onCopy={(v) => handleCopy(v, "eye")} />
                <InfoRow label="身高" value={identity.height} onCopy={(v) => handleCopy(v, "height")} />
                <InfoRow label="体重" value={identity.weight} onCopy={(v) => handleCopy(v, "weight")} />
                <InfoRow label="血型" value={identity.bloodType} onCopy={(v) => handleCopy(v, "blood")} />
                <InfoRow label="SSN" value={identity.ssn} onCopy={(v) => handleCopy(v, "ssn")} />
                <InfoRow label="电话" value={identity.phone} onCopy={(v) => handleCopy(v, "phone")} />
              </>
            )}
            {activeTab === "address" && (
              <>
                <InfoRow label="街道" value={identity.street} onCopy={(v) => handleCopy(v, "street")} />
                <InfoRow label="城市" value={identity.city} onCopy={(v) => handleCopy(v, "city")} />
                <InfoRow label="州" value={identity.state} onCopy={(v) => handleCopy(v, "state")} />
                <InfoRow label="邮编" value={identity.zipCode} onCopy={(v) => handleCopy(v, "zip")} />
                <InfoRow label="完整地址" value={`${identity.street}, ${identity.city}, ${identity.state} ${identity.zipCode}`} onCopy={(v) => handleCopy(v, "address")} />
              </>
            )}
            {activeTab === "work" && (
              <>
                <InfoRow label="职业" value={identity.occupation} onCopy={(v) => handleCopy(v, "occupation")} />
                <InfoRow label="公司" value={identity.company} onCopy={(v) => handleCopy(v, "company")} />
                <InfoRow label="邮箱" value={identity.email} onCopy={(v) => handleCopy(v, "email")} />
                <InfoRow label="用户名" value={identity.username} onCopy={(v) => handleCopy(v, "username")} />
                <InfoRow label="密码" value={identity.password} onCopy={(v) => handleCopy(v, "password")} />
                <InfoRow label="UA" value={identity.userAgent} onCopy={(v) => handleCopy(v, "ua")} />
              </>
            )}
            {activeTab === "card" && (
              <>
                <InfoRow label="类型" value={identity.creditCardType} onCopy={(v) => handleCopy(v, "cardType")} />
                <InfoRow label="卡号" value={identity.creditCardNumber} onCopy={(v) => handleCopy(v, "cardNumber")} />
                <InfoRow label="CVV" value={identity.cvv} onCopy={(v) => handleCopy(v, "cvv")} />
                <InfoRow label="有效期" value={identity.creditCardExpiry} onCopy={(v) => handleCopy(v, "expiry")} />
              </>
            )}
          </div>

          {/* 复制全部 */}
          <button
            type="button"
            onClick={handleCopyAll}
            className="w-full py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm transition-colors"
          >
            {copiedField === "all" ? "已复制全部 ✓" : "复制全部信息"}
          </button>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-sm text-slate-400 dark:text-slate-500">
          点击上方按钮生成身份
        </div>
      )}
    </div>
  );
}
