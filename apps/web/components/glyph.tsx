import type { BusinessType, ExpenseCategory, OnlineOrderStatus, Position } from "@filialhub/shared";
import {
  Apple,
  Ban,
  Banana,
  Bandage,
  Bath,
  Beef,
  Beer,
  Bell,
  BookOpen,
  BrickWall,
  Brush,
  Building2,
  CalendarDays,
  Cake,
  Candy,
  Carrot,
  ChefHat,
  Cherry,
  CircleCheck,
  Citrus,
  ClipboardList,
  Clock,
  Coffee,
  Coins,
  Cookie,
  CookingPot,
  Croissant,
  Crown,
  CupSoda,
  Donut,
  Droplets,
  Drumstick,
  Egg,
  EggFried,
  Fish,
  Flag,
  Flame,
  Footprints,
  Gem,
  Gift,
  GlassWater,
  Glasses,
  Grape,
  Ham,
  Hamburger,
  HandCoins,
  Hammer,
  Hand,
  Headphones,
  Heart,
  HeartHandshake,
  IceCreamCone,
  Inbox,
  Laptop,
  Leaf,
  Lightbulb,
  Lollipop,
  MailOpen,
  MapPin,
  Medal,
  MessageSquare,
  Milk,
  Moon,
  Package,
  PackageOpen,
  PaintRoller,
  Paintbrush,
  PartyPopper,
  Pencil,
  Pill,
  Pizza,
  Plug,
  Plus,
  Popcorn,
  Receipt,
  Rocket,
  Salad,
  Sandwich,
  Scissors,
  Search,
  Settings,
  Shirt,
  ShoppingBag,
  ShoppingBasket,
  ShoppingCart,
  ShowerHead,
  Smartphone,
  Soup,
  Sparkles,
  Sprout,
  Star,
  Stethoscope,
  Store,
  Sun,
  Syringe,
  Trash2,
  TreePalm,
  TrendingUp,
  TriangleAlert,
  Trophy,
  Truck,
  Tv,
  UserRound,
  Users,
  UtensilsCrossed,
  VolumeX,
  Wallet,
  Watch,
  Wheat,
  Wine,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Fragment } from "react";

/**
 * Иконкаҳои аслӣ (Lucide) ба ҷои эмоҷи. Эмоҷиҳое, ки дар матнҳо ва маълумот мемонанд
 * (масалан «🗓 Давомоти имрӯз» дар луғат ё эмоҷии маҳсулот дар база), ба иконка табдил дода мешаванд.
 */
export const EMOJI_ICON: Record<string, LucideIcon> = {
  // Хӯрок
  "🍗": Drumstick, "🍔": Hamburger, "🍟": Popcorn, "🥤": CupSoda, "🧀": Croissant, "🌯": Sandwich, "🥙": Sandwich,
  "🍕": Pizza, "🌭": Sandwich, "🥪": Sandwich, "🍰": Cake, "🎂": Cake, "🍩": Donut, "🍪": Cookie, "🍦": IceCreamCone,
  "🍨": IceCreamCone, "🍫": Candy, "🍬": Candy, "🍭": Lollipop, "☕": Coffee, "🍵": Coffee, "🧃": CupSoda, "🥛": Milk,
  "🍺": Beer, "🍷": Wine, "💧": Droplets, "🥩": Beef, "🍖": Ham, "🥓": Ham, "🐟": Fish, "🍣": Fish, "🥚": Egg, "🍳": EggFried,
  "🍎": Apple, "🍏": Apple, "🍌": Banana, "🍇": Grape, "🍊": Citrus, "🍋": Citrus, "🍒": Cherry, "🍓": Cherry, "🍅": Cherry,
  "🥕": Carrot, "🥔": Carrot, "🥦": Salad, "🥗": Salad, "🍲": Soup, "🍜": Soup, "🫓": Wheat, "🍞": Wheat, "🥐": Croissant,
  "🌾": Wheat, "🍽": UtensilsCrossed, "🍽️": UtensilsCrossed,
  // Либос ва мол
  "👕": Shirt, "👖": Shirt, "👗": Shirt, "👚": Shirt, "🧥": Shirt, "🧣": Shirt, "🧒": Shirt, "👟": Footprints, "👞": Footprints,
  "👠": Footprints, "👜": ShoppingBag, "🛍️": ShoppingBag, "🛍": ShoppingBag, "👓": Glasses, "⌚": Watch, "💍": Gem, "💎": Gem,
  "📱": Smartphone, "💻": Laptop, "🎧": Headphones, "📺": Tv, "🔌": Plug, "💡": Lightbulb,
  "🚰": Droplets, "🚿": ShowerHead, "🛁": Bath, "🔧": Wrench, "🔨": Hammer, "🪚": Hammer, "🧱": BrickWall, "🪣": PaintRoller,
  "🎨": Paintbrush, "✂️": Scissors, "💊": Pill, "💉": Syringe, "🩺": Stethoscope, "🩹": Bandage, "🧴": Droplets, "🌿": Leaf,
  "📦": Package, "🛒": ShoppingCart, "🏪": Store, "🏬": Store, "🏢": Building2, "📚": BookOpen,
  // Одамон ва нақшҳо
  "👑": Crown, "🧑‍💼": UserRound, "👨‍🍳": ChefHat, "💵": Wallet, "🧹": Brush, "👤": UserRound, "👥": Users,
  "🧑‍🤝‍🧑": Users, "👋": Hand,
  // Ҳолатҳо ва амалҳо
  "🆕": Sparkles, "✨": Sparkles, "🛵": Truck, "✅": CircleCheck, "✔️": CircleCheck, "✖️": Ban, "🚫": Ban, "⏰": Clock, "🕓": Clock, "🏁": Flag,
  "🗓": CalendarDays, "🗓️": CalendarDays, "📋": ClipboardList, "📥": Inbox, "⚡": Zap, "🔥": Flame, "🌱": Sprout, "⭐": Star,
  "😴": Moon, "🌙": Moon, "☀️": Sun, "🌴": TreePalm, "🎉": PartyPopper, "🎈": PartyPopper, "🎁": Gift, "💝": HeartHandshake,
  "❤️": Heart, "💛": Heart, "🏆": Trophy, "🥇": Medal, "🥈": Medal, "🥉": Medal, "🧾": Receipt, "📊": TrendingUp, "📈": TrendingUp,
  "💰": Coins, "💸": HandCoins, "💳": Wallet, "📍": MapPin, "💬": MessageSquare, "📭": MailOpen, "📩": MailOpen, "✉️": MailOpen,
  "🔔": Bell, "🔎": Search, "⚙️": Settings, "➕": Plus, "✏️": Pencil, "🗑": Trash2, "⚠️": TriangleAlert, "🔇": VolumeX,
  "📝": Pencil, "🚀": Rocket, "🍃": Leaf, "💼": Wallet, "📣": Sparkles, "📦️": PackageOpen,
};

/** Як эмоҷи ё пайдарпаии ZWJ (масалан 🧑‍💼) */
const EMOJI_SRC = /(\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic}|\p{Emoji_Modifier})*)/u.source;
const HAS_EMOJI = new RegExp(EMOJI_SRC, "u");
const EMOJI_ALL = new RegExp(EMOJI_SRC, "gu");

export function Glyph({ e, className = "size-4" }: { e: string; className?: string }) {
  const Icon = EMOJI_ICON[e] ?? EMOJI_ICON[e.replace(/️/g, "")];
  return Icon ? <Icon className={className} aria-hidden /> : null;
}

/** Матнро бо иконкаҳо ба ҷои эмоҷиҳо нишон медиҳад: «🗓 Давомот» → [иконка] Давомот */
export function Iconized({ text, className = "inline size-[1.05em] -mt-0.5 align-middle" }: { text: string; className?: string }) {
  if (!HAS_EMOJI.test(text)) return <>{text}</>;
  // split бо гурӯҳ: ҷуфтҳо — матн, тоқҳо — эмоҷи
  const parts = text.split(EMOJI_ALL);
  return <>{parts.map((p, i) => (i % 2 === 1 ? <Glyph key={i} e={p} className={className} /> : <Fragment key={i}>{p}</Fragment>))}</>;
}

/** Эмоҷиҳоро аз матн хориҷ мекунад (барои toast, title ва ғайра) */
export function stripEmoji(text: string) {
  return text.replace(EMOJI_ALL, "").replace(/\s{2,}/g, " ").trim();
}

export function iconize(node: React.ReactNode): React.ReactNode {
  return typeof node === "string" ? <Iconized text={node} /> : node;
}

// ---------- Иконкаҳои мушаххас ----------

export const BUSINESS_ICON: Record<BusinessType, LucideIcon> = {
  RESTAURANT: UtensilsCrossed,
  GROCERY: ShoppingBasket,
  CLOTHING: Shirt,
  PLUMBING: Droplets,
  ELECTRONICS: Smartphone,
  PHARMACY: Pill,
  BUILDING: BrickWall,
  OTHER: Store,
};

export function BusinessIcon({ type, className = "size-4" }: { type: BusinessType | null | undefined; className?: string }) {
  const Icon = BUSINESS_ICON[type ?? "OTHER"] ?? Store;
  return <Icon className={className} aria-hidden />;
}

export const POSITION_ICON: Record<Position, LucideIcon> = {
  COOK: ChefHat,
  WAITER: UtensilsCrossed,
  CASHIER: Wallet,
  CLEANER: Brush,
  SELLER: ShoppingBag,
  STOREKEEPER: Package,
};

export function PositionIcon({ position, className = "size-4" }: { position: Position | null | undefined; className?: string }) {
  const Icon = position ? POSITION_ICON[position] : UserRound;
  return <Icon className={className} aria-hidden />;
}

export const STATUS_ICON: Record<OnlineOrderStatus, LucideIcon> = {
  NEW: Sparkles,
  ACCEPTED: PackageOpen,
  DELIVERING: Truck,
  DELIVERED: CircleCheck,
  CANCELLED: Ban,
};

export function StatusIcon({ status, className = "size-4" }: { status: OnlineOrderStatus; className?: string }) {
  const Icon = STATUS_ICON[status];
  return <Icon className={className} aria-hidden />;
}

export const EXPENSE_ICON: Record<ExpenseCategory, LucideIcon> = {
  RENT: Building2,
  SALARY: Wallet,
  UTILITIES: Lightbulb,
  SUPPLIES: Package,
  MARKETING: Sparkles,
  OTHER: Receipt,
};

export function ExpenseIcon({ category, className = "size-4" }: { category: ExpenseCategory; className?: string }) {
  const Icon = EXPENSE_ICON[category];
  return <Icon className={className} aria-hidden />;
}

/** Иконкаҳое, ки соҳиби мағоза барои маҳсулот интихоб мекунад (дар база ҳамчун "icon:Номи") */
export const PRODUCT_ICONS: Record<string, LucideIcon> = {
  Hamburger, Pizza, Drumstick, Sandwich, Soup, Salad, Coffee, CupSoda, Milk, Beer, Wine, GlassWater, Cake, Donut, Cookie,
  IceCreamCone, Candy, Croissant, Wheat, Beef, Ham, Fish, Egg, Apple, Banana, Grape, Cherry, Citrus, Carrot, CookingPot,
  Shirt, Footprints, ShoppingBag, Glasses, Watch, Gem, Smartphone, Laptop, Headphones, Tv, Plug, Lightbulb,
  Droplets, ShowerHead, Bath, Wrench, Hammer, PaintRoller, Paintbrush, BrickWall, Scissors,
  Pill, Syringe, Stethoscope, Bandage, Leaf, Package, Gift, BookOpen, Star,
};

/** Иконкаи маҳсулот: "icon:Номи" ё эмоҷии кӯҳна (ба иконка табдил) ё иконкаи навъи бизнес */
export function ProductIcon({ value, type, className = "size-6" }: { value: string | null | undefined; type?: BusinessType | null; className?: string }) {
  const v = value ?? "";
  const Icon = (v.startsWith("icon:") ? PRODUCT_ICONS[v.slice(5)] : EMOJI_ICON[v] ?? EMOJI_ICON[v.replace(/️/g, "")]) ?? BUSINESS_ICON[type ?? "OTHER"] ?? Package;
  return <Icon className={className} aria-hidden />;
}
