'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabaseBrowser } from '@/lib/supabase/browser';

/* -------------------- Types -------------------- */
type Schema = {
    form: { id: string; slug: string; version: number; title_json: any };
    sections: Array<{
        id: string;
        key: string;
        title_json: any;
        calc_json?: any;
        order_no?: number;
        fields: Array<{
            id: string;
            key: string;
            type: 'radio' | 'text' | 'number' | 'select' | 'multiselect' | 'checkbox';
            label_json: any;
            is_required: boolean;
            meta_json?: any;
            order_no: number;
            options: Array<{ id: string; value: string; label_json: any; score?: number; order_no: number }>;
        }>;
    }>;
};

const t = (j: any, locale: string) => (j?.[locale] ?? j?.th ?? Object.values(j || {})[0] ?? '');

/* -------------------- Helpers -------------------- */
function bmi(heightCm?: number, weightKg?: number) {
    if (!heightCm || !weightKg) return { bmi: null as number | null, status: '' };
    const m = heightCm / 100;
    const val = +(weightKg / (m * m)).toFixed(1);
    let status = 'ปกติ';
    if (val < 18.5) status = 'น้ำหนักน้อย';
    else if (val >= 25 && val < 30) status = 'ท้วม/เริ่มอ้วน';
    else if (val >= 30) status = 'อ้วน';
    return { bmi: val, status };
}
function bsaMosteller(heightCm?: number, weightKg?: number) {
    if (!heightCm || !weightKg) return null as number | null;
    return +Math.sqrt((heightCm * weightKg) / 3600).toFixed(2);
}
function bsaStatusText(bsaValue?: number | null) {
    if (bsaValue == null) return '';
    if (bsaValue < 1.4) return 'ร่างกายเล็ก';
    if (bsaValue <= 1.9) return 'ร่างกายปกติ';
    return 'ร่างกายใหญ่';
}
function sumScores(fields: any[], values: Record<string, any>) {
    let total = 0;
    for (const f of fields) {
        const v = values[f.key];
        const opt = (f.options || []).find((o: any) => o.value === v);
        if (opt && typeof opt.score === 'number') total += opt.score;
    }
    return total;
}

/* ===================== Component ===================== */
export default function DynamicSurvey({ schema, locale }: { schema: Schema; locale: string }) {
    const sections = schema.sections || [];

    // ให้ 'general' มาก่อน แล้วตามด้วย diet -> knowledge -> st5 -> summary
    const ordered = useMemo(() => {
        const preferred = ['general', 'diet', 'knowledge', 'st5'] as const;
        const picked = preferred.map(k => sections.find(s => s.key === k)).filter(Boolean) as Schema['sections'];
        const rest = sections
            .filter(s => !preferred.includes(s.key as any))
            .sort((a, b) => (a.order_no ?? 0) - (b.order_no ?? 0));

        const base = [...picked, ...rest];

        // แทรก "summary" เป็น section ปลอมไว้ท้ายสุด
        const summarySec: any = {
            id: '__summary__',
            key: 'summary',
            title_json: { th: 'สรุปผลการประเมิน' },
            fields: [],
        };
        return [...base, summarySec];
    }, [sections]);

    const [step, setStep] = useState(() => {
        const idx = ordered.findIndex(s => s?.key === 'general');
        return idx >= 0 ? idx : 0;
    });
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [showValidation, setShowValidation] = useState(false);

    const sec = ordered[step];

    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const supabase = useMemo(() => supabaseBrowser(), []);

    /* ---------- init & scroll ---------- */
    useEffect(() => {
        const saved = sessionStorage.getItem('surveyAnswers');
        if (saved) setAnswers(JSON.parse(saved));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [step]);
    useEffect(() => {
        const idx = ordered.findIndex(s => s.key === 'general');
        setStep(idx >= 0 ? idx : 0);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ordered]);

    /* ---------- set values ---------- */
    const setValue = (key: string, val: any) => {
        setAnswers(prev => {
            const next = { ...prev };
            if (prev[key] === val) delete next[key];
            else next[key] = val;

            sessionStorage.setItem('surveyAnswers', JSON.stringify(next));
            if (showValidation) setShowValidation(false);
            return next;
        });
    };

    // helper หา value ของ "ไม่มี" และ "อื่นๆ" จาก options (ดูทั้ง value และ label)
    const getSpecialValues = (opts: Array<{ value: string; label_json: any }>, locale: string) => {
        let noneVal: string | null = null
        let otherVal: string | null = null
        for (const o of opts) {
            const txt = (t(o.label_json, locale) || '').trim().toLowerCase()
            const v = (o.value || '').trim().toLowerCase()
            if (v === 'none' || v === 'no' || /^(ไม่มี|none|no)$/i.test(txt)) noneVal = o.value
            if (v === 'other' || /(อื่นๆ?|other)/i.test(txt)) otherVal = o.value
        }
        return { noneVal, otherVal }
    }

    const setMultiValue = (
        key: string,
        val: string,
        opts: Array<{ value: string; label_json: any }>
    ) => {
        setAnswers(prev => {
            const arr: string[] = Array.isArray(prev[key]) ? [...prev[key]] : []
            const { noneVal, otherVal } = getSpecialValues(opts, locale)

            let nextArr = arr
            const isClickingNone = !!noneVal && val === noneVal
            const isSelected = arr.includes(val)

            if (isClickingNone) {
                // คลิก "ไม่มี" → toggle: ถ้าติดอยู่ให้ถอด, ถ้าไม่ติดให้เหลือ "ไม่มี" ตัวเดียว
                if (arr.includes(noneVal!)) nextArr = []
                else nextArr = [noneVal!]
            } else {
                // คลิกตัวเลือกอื่น
                if (isSelected) {
                    nextArr = arr.filter(x => x !== val)            // เอาออก
                } else {
                    nextArr = [...arr.filter(x => x !== noneVal), val] // ใส่ค่าใหม่ + ล้าง "ไม่มี"
                }
            }

            // ล้างรายละเอียดอื่นๆ ถ้าไม่ได้เลือก "อื่นๆ"
            const next: Record<string, any> = { ...prev, [key]: nextArr }
            if (!(otherVal && nextArr.includes(otherVal))) delete next[`${key}__other`]

            sessionStorage.setItem('surveyAnswers', JSON.stringify(next))
            if (showValidation) setShowValidation(false)
            return next
        })
    }



    /* ---------- progress (นับเฉพาะฟิลด์ที่แสดงจริง) ---------- */
    const fieldsForProgress = useMemo(() => {
        if (!sec) return [];
        if (sec.key === 'summary') return []; // summary ไม่ต้องนับฟิลด์
        if (sec.key !== 'general') return sec.fields;

        const L = (f: any) => t(f.label_json, locale).trim();
        const surgeryCtrl = sec.fields.find((f: any) => f.key === 'surgery' || /ประวัติการผ่าตัด/i.test(L(f)));
        const ctrlVal = surgeryCtrl ? answers[surgeryCtrl.key] : undefined;
        const ctrlLabel = surgeryCtrl
            ? t((surgeryCtrl.options || []).find((o: any) => o.value === ctrlVal)?.label_json, locale)
            : '';
        const hasSurgery = /มี|yes/i.test(ctrlLabel || '');

        return sec.fields.filter((f: any) => {
            const label = L(f);
            if (/^ระบุ\s*\((ยาที่ใช้ประจำ|โรคประจำตัว)\)/i.test(label)) return false;
            if (/ระบุ.*ผ่าตัด|รายละเอียด.*ผ่าตัด/i.test(label) && !hasSurgery) return false;
            return true;
        });
    }, [sec, answers, locale]);

    const hasAnswer = (f: any) => {
        const v = answers[f.key];
        if (f.type === 'checkbox' || f.type === 'multiselect') return Array.isArray(v) && v.length > 0;
        return v !== undefined && v !== null && v !== '';
    };

    const totalRequired = useMemo(
        () => fieldsForProgress.filter((f: any) => f.is_required).length,
        [fieldsForProgress]
    );
    const answeredRequired = useMemo(
        () => fieldsForProgress.filter((f: any) => f.is_required && hasAnswer(f)).length,
        [fieldsForProgress, answers]
    );

    const progressPct = useMemo(
        () => (sec?.key === 'summary' ? 100 : totalRequired ? Math.round((answeredRequired / totalRequired) * 100) : 0),
        [sec, totalRequired, answeredRequired]
    );

    const goNext = () => {
        // Check for invalid email in general section
        if (sec?.key === 'general') {
            const emailField = sec.fields.find((f: any) => f.key === 'email' || /email|อีเมล/i.test(t(f.label_json, locale)));
            if (emailField) {
                const emailVal = answers[emailField.key];
                if (emailVal && !emailVal.endsWith('@gmail.com')) {
                    alert('กรุณาใช้อีเมล @gmail.com เท่านั้น');
                    document.getElementById(emailField.key)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    return;
                }
            }
        }

        if (sec?.key !== 'summary' && answeredRequired !== totalRequired) {
            setShowValidation(true);
            const first = (fieldsForProgress || []).find((f: any) => f.is_required && !hasAnswer(f));
            if (first) document.getElementById(first.key)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
        setStep(s => Math.min(ordered.length - 1, s + 1));
    };
    const goPrev = () => setStep(s => Math.max(0, s - 1));

    /* ---------- submit ---------- */
    const handleSubmit = async () => {
        if (isSubmitting) return;
        try {
            setIsSubmitting(true);

            const height = Number(answers['height_cm']);
            const weight = Number(answers['weight_kg']);
            const { bmi: bmiValue, status: bmiStatus } = bmi(height, weight);
            const bsaValue = bsaMosteller(height, weight);
            const bsaSize = bsaStatusText(bsaValue);

            // (auth ไม่จำเป็นต้องแนบ user id แล้ว)
            await supabase.auth.getUser();

            const answersWithComputed = {
                ...answers,
                _computed: {
                    bmi: bmiValue,
                    bmi_status: bmiStatus,
                    bsa: bsaValue,
                    bsa_status: bsaSize,
                },
            };

            const TABLE = 'survey_sessions';
            const payload = {
                form_id: schema.form.id,
                form_slug: schema.form.slug,
                form_version: schema.form.version,
                answers: answersWithComputed,
                status: 'submitted',
                submitted_at: new Date().toISOString(),
            };

            const { error } = await supabase.from(TABLE).insert(payload);
            if (error) throw error;

            sessionStorage.removeItem('surveyAnswers');
            router.replace('/thank-you'); // ✅ สรุป -> ยืนยันส่ง -> thank-you
        } catch (err) {
            console.error('submit failed:', err);
            alert('ส่งคำตอบไม่สำเร็จ กรุณาลองใหม่');
        } finally {
            setIsSubmitting(false);
        }
    };

    /* ===================== Section 2: ข้อมูลทั่วไป ===================== */
    const generalSec = ordered.find(s => s?.key === 'general');

    const renderGeneral = () => {
        if (!generalSec) return null;
        const fields = [...generalSec.fields];

        const keyPriority: Record<string, number> = {
            email: 0, age: 1, gender: 2, class_year: 3, height_cm: 4, weight_kg: 5,
        };
        fields.sort((a, b) => {
            const pa = keyPriority[a.key] ?? 1000 + a.order_no;
            const pb = keyPriority[b.key] ?? 1000 + b.order_no;
            return pa - pb;
        });

        const surgeryCtrl = fields.find(
            f => f.key === 'surgery' || /ประวัติการผ่าตัด/i.test(t(f.label_json, locale))
        );

        const ctrlVal = surgeryCtrl ? answers[surgeryCtrl.key] : undefined;
        const ctrlLabel = surgeryCtrl
            ? t((surgeryCtrl.options || []).find((o: any) => o.value === ctrlVal)?.label_json, locale)
            : '';
        const surgeryIsYes = /^(มี|yes)$/i.test((ctrlLabel || '').trim());

        const hField = fields.find(f => f.key === 'height_cm') || fields.find(f => /ส่วนสูง|height/i.test(t(f.label_json, locale)));
        const wField = fields.find(f => f.key === 'weight_kg') || fields.find(f => /น้ำหนัก|weight/i.test(t(f.label_json, locale)));
        const hVal = Number(answers[hField?.key || ''] ?? 0) || undefined;
        const wVal = Number(answers[wField?.key || ''] ?? 0) || undefined;
        const bmiInfo = bmi(hVal, wVal);
        const bsaVal = bsaMosteller(hVal, wVal);
        const bsaTxt = bsaStatusText(bsaVal);

        const renderOne = (f: any) => {
            const label = t(f.label_json, locale);
            const val = answers[f.key];

            if (/ระบุ.*ผ่าตัด|รายละเอียด.*ผ่าตัด/i.test(label) && !surgeryIsYes) return null;
            if (/ระบุ.*(โรคประจำตัว|ยาที่ใช้ประจำ)/i.test(label)) return null;

            if (f.type === 'text' || f.type === 'number') {
                const isEmail = f.key === 'email' || /email|อีเมล/i.test(label);
                const isValidEmail = !isEmail || !val || val.endsWith('@gmail.com');

                const input = (
                    <div key={f.id} id={f.key} className="mb-4">
                        <label className="block font-medium mb-1">
                            {label}{f.is_required && ' *'}
                        </label>
                        <input
                            type={isEmail ? 'email' : f.type === 'number' ? 'number' : 'text'}
                            className={`w-full rounded-lg border px-3 py-2 ${!isValidEmail ? 'border-red-500 focus:ring-red-500' : ''}`}
                            value={val ?? ''}
                            min={0}
                            max={f.key === 'age' ? 120 : f.key === 'height_cm' ? 250 : f.key === 'weight_kg' ? 300 : undefined}
                            onChange={(e) => {
                                const v = e.target.value;
                                if (isEmail) {
                                    setValue(f.key, v.trim());
                                } else if (f.type === 'number') {
                                    if (v === '') {
                                        setValue(f.key, undefined);
                                    } else {
                                        let num = Number(v);
                                        if (f.key === 'age' && num > 120) num = 120;
                                        if (f.key === 'height_cm' && num > 250) num = 250;
                                        if (f.key === 'weight_kg' && num > 300) num = 300;
                                        if (num < 0) num = 0;
                                        setValue(f.key, num);
                                    }
                                } else {
                                    setValue(f.key, v);
                                }
                            }}
                            placeholder={isEmail ? 'name@gmail.com' : undefined}
                        />
                        {!isValidEmail && (
                            <p className="text-red-500 text-sm mt-1">กรุณาใช้อีเมล @gmail.com เท่านั้น</p>
                        )}
                    </div>
                );
                if (wField && f.key === wField.key) {
                    return (
                        <div key={f.id + '__with_metrics'}>
                            {input}
                            <div className="p-3 rounded-xl border bg-gray-50 text-sm mt-2">
                                <div className="flex flex-wrap gap-4">
                                    <span>
                                        <span className="font-medium">BMI:</span>{' '}
                                        {bmiInfo.bmi ?? '-'} {bmiInfo.status ? `(${bmiInfo.status})` : ''}
                                    </span>
                                    <span>
                                        <span className="font-medium">BSA:</span>{' '}
                                        {bsaVal ?? '-'} {bsaTxt ? `(${bsaTxt})` : ''}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                }
                return input;
            }

            if (f.type === 'radio') {
                return (
                    <div key={f.id} id={f.key} className="mb-4 rounded-xl border bg-white px-3 py-3">
                        <div className="font-medium mb-2">
                            {label}{f.is_required && ' *'}
                        </div>
                        <div className="space-y-2">
                            {(f.options || [])
                                .sort((a: any, b: any) => (a.order_no ?? 0) - (b.order_no ?? 0))
                                .map((o: any) => (
                                    <label
                                        key={o.id}
                                        className="w-full flex items-center rounded-lg border px-3 py-2 hover:bg-gray-50 cursor-pointer"
                                    >
                                        <input
                                            type="radio"
                                            name={f.key}
                                            className="mr-2"
                                            checked={val === o.value}
                                            onChange={() => setValue(f.key, val === o.value ? undefined : o.value)}
                                        />
                                        <span>{t(o.label_json, locale)}</span>
                                    </label>
                                ))}
                        </div>
                    </div>
                );
            }

            if (f.type === 'select') {
                return (
                    <div key={f.id} id={f.key} className="mb-4 rounded-xl border bg-white px-3 py-3">
                        <label className="block font-medium mb-1">
                            {label}{f.is_required && ' *'}
                        </label>
                        <select
                            className="w-full rounded-lg border px-3 py-2"
                            value={val ?? ''}
                            onChange={(e) => setValue(f.key, e.target.value)}
                        >
                            <option value="">เลือก...</option>
                            {(f.options || [])
                                .sort((a: any, b: any) => (a.order_no ?? 0) - (b.order_no ?? 0))
                                .map((o: any) => (
                                    <option key={o.id} value={o.value}>
                                        {t(o.label_json, locale)}
                                    </option>
                                ))}
                        </select>
                    </div>
                );
            }

            if (f.type === 'multiselect' || f.type === 'checkbox') {
                type Option = { id: string; value: string; label_json: any; order_no?: number }
                const arr: string[] = Array.isArray(val) ? val : []
                const opts = ((f.options || []) as Option[])
                    .sort((a, b) => (a.order_no ?? 0) - (b.order_no ?? 0))

                const { noneVal, otherVal } = getSpecialValues(opts, locale)
                const hasNone = !!noneVal && arr.includes(noneVal)
                const hasOther = !!otherVal && arr.includes(otherVal)

                return (
                    <div key={f.id} id={f.key} className="mb-4">
                        <div className="font-medium mb-1">
                            {t(f.label_json, locale)}{f.is_required && ' *'}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {opts.map(o => {
                                const on = arr.includes(o.value)
                                const isNone = !!noneVal && o.value === noneVal
                                const disabled = hasNone && !isNone // ถ้าเลือก "ไม่มี" → ปิดเฉพาะตัวที่ไม่ใช่ "ไม่มี"

                                return (
                                    <label
                                        key={o.id}
                                        className={`flex items-center rounded-lg border px-3 py-2 ${disabled ? 'opacity-40 pointer-events-none' : 'hover:bg-gray-50 cursor-pointer'
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            className="mr-2"
                                            checked={on}
                                            disabled={disabled}
                                            onChange={() => setMultiValue(f.key, o.value, opts)}
                                        />
                                        <span>{t(o.label_json, locale) || ''}</span>
                                    </label>
                                )
                            })}
                        </div>

                        {/* ช่อง "อื่นๆ" โผล่เมื่อถูกเลือก */}
                        {hasOther && (
                            <div className="mt-2">
                                <input
                                    type="text"
                                    className="w-full rounded-lg border px-3 py-2"
                                    placeholder="โปรดระบุรายละเอียด"
                                    value={answers[`${f.key}__other`] ?? ''}
                                    onChange={(e) => setValue(`${f.key}__other`, e.target.value)}
                                />
                                <p className="text-xs text-gray-500 mt-1">ระบบจะบันทึกข้อความนี้คู่กับตัวเลือก “อื่นๆ”</p>
                            </div>
                        )}
                    </div>
                )
            }

            return null;
        };

        return <div className="space-y-6">{fields.map(renderOne)}</div>;
    };

    /* ===================== Section 3: Diet ===================== */
    const diet = ordered.find(s => s?.key === 'diet');
    const dietGroups = useMemo(() => {
        if (!diet) return {};
        const groups: Record<string, any[]> = {};
        for (const f of diet.fields) {
            const g = f.meta_json?.table_group || 'ungrouped';
            if (!groups[g]) groups[g] = [];
            groups[g].push(f);
        }
        for (const g of Object.keys(groups)) groups[g].sort((a, b) => a.order_no - b.order_no);
        return groups;
    }, [diet]);

    const diet31Score = sumScores(dietGroups['diet31'] || [], answers);
    const diet32Score = sumScores(dietGroups['diet32'] || [], answers);
    const diet33Score = sumScores(dietGroups['diet33'] || [], answers);

    const getScoreColor = (score: number) => {
        if (score === 5) return 'green';
        if (score >= 6 && score <= 9) return 'yellow';
        if (score >= 10 && score <= 13) return 'orange';
        if (score >= 14 && score <= 15) return 'red';
        return 'gray';
    };
    const getScoreColorClasses = (color: string) => {
        switch (color) {
            case 'green': return { bg: 'bg-green-50', border: 'border-green-500', text: 'text-green-800', badge: 'bg-green-100 text-green-800' };
            case 'yellow': return { bg: 'bg-yellow-50', border: 'border-yellow-500', text: 'text-yellow-800', badge: 'bg-yellow-100 text-yellow-800' };
            case 'orange': return { bg: 'bg-orange-50', border: 'border-orange-500', text: 'text-orange-800', badge: 'bg-orange-100 text-orange-800' };
            case 'red': return { bg: 'bg-red-50', border: 'border-red-500', text: 'text-red-800', badge: 'bg-red-100 text-red-800' };
            default: return { bg: 'bg-gray-50', border: 'border-gray-500', text: 'text-gray-800', badge: 'bg-gray-100 text-gray-800' };
        }
    };
    const getScoreMessage = (score: number, type: 'sugar' | 'fat' | 'sodium') => {
        if (score === 5) {
            if (type === 'sugar') return 'ยินดีด้วย คุณบริโภคน้ำตาลในปริมาณที่พอเหมาะ';
            if (type === 'fat') return 'คุณมีความเสี่ยงน้อยในการได้รับผลเสียจากการบริโภคไขมันไม่เหมาะสม';
            if (type === 'sodium') return 'ยินดีด้วยคุณได้รับโซเดียมในปริมาณที่น้อย ทำดีแล้วนะ';
        } else if (score >= 6 && score <= 9) {
            if (type === 'sugar') return 'คุณมีความเสี่ยงปานกลางในแง่ของพฤติกรรมการบริโภคน้ำตาล';
            if (type === 'fat') return 'คุณมีความเสี่ยงปานกลางในการเลือกบริโภคไขมัน';
            if (type === 'sodium') return 'คุณได้รับโซเดียมในระดับปานกลาง ยังถือว่าไม่มีอันตรายอะไรมากต่อสุขภาพ';
        } else if (score >= 10 && score <= 13) {
            if (type === 'sugar') return 'คุณมีความเสี่ยงสูงในแง่ของพฤติกรรมการบริโภคน้ำตาล';
            if (type === 'fat') return 'คุณมีความเสี่ยงสูงในการเลือกบริโภคไขมัน';
            if (type === 'sodium') return 'คุณได้รับโซเดียมในปริมาณสูงแน่ๆ ถึงเวลาตระหนักถึงพฤติกรรมการบริโภคได้แล้ว';
        } else if (score >= 14 && score <= 15) {
            if (type === 'sugar') return 'รู้ตัวบ้างไหม? ว่าคุณมีความเสี่ยงสูงมาก กับการได้รับน้ำตาลเกิน';
            if (type === 'fat') return 'คุณมีพฤติกรรมการบริโภคไขมันที่อันตรายต่อชีวิตคุณมาก';
            if (type === 'sodium') return 'คุณได้รับโซเดียมสูงมากกก แนะนำให้ปรับเปลี่ยนพฤติกรรมการบริโภคโดยด่วน';
        }
        return '';
    };

    const renderDietTable = (groupKey: string, title: string, type: 'sugar' | 'fat' | 'sodium') => {
        const rows = dietGroups[groupKey] || [];
        if (!rows.length) return null;
        const opts = rows[0]?.options || [];
        const score = type === 'sugar' ? diet31Score : type === 'fat' ? diet32Score : diet33Score;
        const color = getScoreColor(score);
        const colorClasses = getScoreColorClasses(color);
        const scoreMsg = getScoreMessage(score, type);

        return (
            <div className="space-y-4 sm:space-y-5 md:space-y-6" key={groupKey}>
                <h2 className="text-sm sm:text-base md:text-lg lg:text-xl font-medium text-blue-600 leading-relaxed border-l-4 border-blue-500 pl-3 sm:pl-4">
                    {title}
                </h2>
                {/* Mobile View: Cards */}
                <div className="block md:hidden space-y-4">
                    {rows.map((f: any) => {
                        const isAnswered = !!answers[f.key];
                        const isHighlighted = showValidation && f.is_required && !isAnswered;
                        return (
                            <div key={f.id} id={f.key} className={`p-4 rounded-lg border ${isHighlighted ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'} shadow-sm`}>
                                <div className="font-medium text-gray-800 mb-3 text-sm">
                                    {t(f.label_json, locale)}
                                    {isHighlighted && <AlertCircle className="w-4 h-4 text-red-500 inline-block ml-2" />}
                                </div>
                                <div className="space-y-2">
                                    {opts.map((o: any) => (
                                        <div
                                            key={o.id}
                                            onClick={() => setValue(f.key, o.value)}
                                            className={`flex items-center p-3 rounded-md border cursor-pointer transition-all ${answers[f.key] === o.value
                                                ? 'bg-blue-50 border-blue-500 text-blue-700'
                                                : 'border-gray-200 hover:bg-gray-50'
                                                }`}
                                        >
                                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center mr-3 flex-shrink-0 ${answers[f.key] === o.value ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                                                }`}>
                                                {answers[f.key] === o.value && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                            </div>
                                            <span className="text-sm">{t(o.label_json, locale)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Desktop View: Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full border-collapse bg-gray-50 rounded-lg shadow-sm">
                        <thead>
                            <tr className="bg-gray-100 border-b border-gray-200">
                                <th className="p-2 text-left text-xs sm:text-sm font-semibold text-gray-700 min-w-[180px]">รายการ</th>
                                {opts.map((o: any) => (
                                    <th key={o.id} className="p-2 text-center text-xs sm:text-sm font-semibold text-gray-700">
                                        <div className="w-full min-w-[180px]">{t(o.label_json, locale)}</div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((f: any) => {
                                const isAnswered = !!answers[f.key];
                                const isHighlighted = showValidation && f.is_required && !isAnswered;
                                return (
                                    <tr key={f.id} id={f.key}
                                        className={`border-b border-gray-200 last:border-b-0 transition-all duration-200 ${isHighlighted ? 'bg-red-50' : 'hover:bg-white'}`}>
                                        <td className="p-2 text-xs sm:text-sm text-gray-800 font-medium">
                                            {t(f.label_json, locale)}
                                            {isHighlighted && <AlertCircle className="w-4 h-4 text-red-500 inline-block ml-2" />}
                                        </td>
                                        {opts.map((o: any) => (
                                            <td key={o.id} className="p-1 text-center">
                                                <div
                                                    onClick={() => setValue(f.key, o.value)}
                                                    className={`flex items-center justify-center w-full h-full py-1.5 px-0.5 rounded-md cursor-pointer transition-all duration-200 border-2 ${answers[f.key] === o.value ? 'bg-blue-100 border-blue-500' : 'border-transparent hover:bg-blue-50 hover:border-blue-200'}`}
                                                    style={{ minWidth: '160px' }}
                                                >
                                                    <div className={`w-3.5 h-3.5 border-2 rounded-full flex items-center justify-center transition-all duration-200 ${answers[f.key] === o.value ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white'}`}>
                                                        {answers[f.key] === o.value && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                                    </div>
                                                </div>
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className={`${colorClasses.bg} p-3 sm:p-4 md:p-5 lg:p-6 rounded-lg space-y-2 sm:space-y-3 border-l-4 ${colorClasses.border}`}>
                    <h3 className={`text-sm sm:text-base md:text-lg lg:text-xl font-medium ${colorClasses.text}`}>ผลการประเมิน</h3>
                    <div className="space-y-1 sm:space-y-2">
                        <p className={`text-xs sm:text-sm md:text-base lg:text-lg ${colorClasses.text}`}>
                            <span className="font-medium">คะแนน:</span>
                            <span className={`ml-2 px-2 py-1 rounded-md font-bold ${colorClasses.badge}`}>{score}</span>
                        </p>
                        {scoreMsg && <p className={`text-xs sm:text-sm md:text-base lg:text-lg ${colorClasses.text} leading-relaxed`}>{scoreMsg}</p>}
                    </div>
                </div>
            </div>
        );
    };

    /* ===================== Section 4: Knowledge ===================== */
    const knowledge = ordered.find(s => s?.key === 'knowledge');
    const k41Rows = (knowledge?.fields || []).filter((f: any) => f.meta_json?.table_group === 'k41');
    const k42 = (knowledge?.fields || []).find((f: any) => f.key === 'k42');
    const k43 = (knowledge?.fields || []).find((f: any) => f.key === 'k43');

    const renderKnowledge = () => {
        if (!knowledge) return null;
        return (
            <div className="space-y-8">
                {k41Rows.length > 0 && (
                    <div className="space-y-4 sm:space-y-5 md:space-y-6">
                        <h2 className="text-sm sm:text-base md:text-lg lg:text-xl font-medium text-blue-600 leading-relaxed border-l-4 border-blue-500 pl-3 sm:pl-4">
                            4.1 เลือกกินหรือจะรักษาน้ำหนักอย่างมีสุขภาพดี
                        </h2>
                        {/* Mobile View: Cards */}
                        <div className="block md:hidden space-y-4">
                            {k41Rows.map((f: any) => {
                                const opts = f.options || [];
                                const isAnswered = !!answers[f.key];
                                const isHighlighted = showValidation && f.is_required && !isAnswered;
                                return (
                                    <div key={f.id} id={f.key} className={`p-4 rounded-lg border ${isHighlighted ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'} shadow-sm`}>
                                        <div className="font-medium text-gray-800 mb-3 text-sm">
                                            {t(f.label_json, locale)}
                                            {isHighlighted && <AlertCircle className="w-4 h-4 text-red-500 inline-block ml-2" />}
                                        </div>
                                        <div className="space-y-2">
                                            {opts.map((o: any) => (
                                                <div
                                                    key={o.id}
                                                    onClick={() => setValue(f.key, o.value)}
                                                    className={`flex items-center p-3 rounded-md border cursor-pointer transition-all ${answers[f.key] === o.value
                                                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                                                        : 'border-gray-200 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center mr-3 flex-shrink-0 ${answers[f.key] === o.value ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                                                        }`}>
                                                        {answers[f.key] === o.value && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                                    </div>
                                                    <span className="text-sm">{t(o.label_json, locale)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Desktop View: Table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full border-collapse bg-gray-50 rounded-lg shadow-sm">
                                <thead>
                                    <tr className="bg-gray-100 border-b border-gray-200">
                                        <th className="p-2 text-left text-xs sm:text-sm font-semibold text-gray-700 min-w-[180px]">รายการ</th>
                                        {(k41Rows[0]?.options || []).map((o: any) => (
                                            <th key={o.id} className="p-2 text-center text-xs sm:text-sm font-semibold text-gray-700 min-w-[120px]">
                                                {t(o.label_json, locale)}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {k41Rows.map((f: any) => {
                                        const opts = f.options || [];
                                        const isAnswered = !!answers[f.key];
                                        const isHighlighted = showValidation && f.is_required && !isAnswered;
                                        return (
                                            <tr key={f.id} id={f.key}
                                                className={`border-b border-gray-200 last:border-b-0 transition-all duration-200 ${isHighlighted ? 'bg-red-50' : 'hover:bg-white'}`}>
                                                <td className="p-2 text-xs sm:text-sm text-gray-800 font-medium">
                                                    {t(f.label_json, locale)}
                                                    {isHighlighted && <AlertCircle className="w-4 h-4 text-red-500 inline-block ml-2" />}
                                                </td>
                                                {opts.map((o: any) => (
                                                    <td key={o.id} className="p-1 text-center">
                                                        <div
                                                            onClick={() => setValue(f.key, o.value)}
                                                            className={`flex items-center justify-center w-full h-full py-1.5 px-0.5 rounded-md cursor-pointer transition-all duration-200 border-2 ${answers[f.key] === o.value ? 'bg-blue-100 border-blue-500' : 'border-transparent hover:bg-blue-50 hover:border-blue-200'}`}
                                                        >
                                                            <div className={`w-3.5 h-3.5 border-2 rounded-full flex items-center justify-center ${answers[f.key] === o.value ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white'}`}>
                                                                {answers[f.key] === o.value && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                                            </div>
                                                        </div>
                                                    </td>
                                                ))}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {k42 && (
                    <div className="space-y-4 sm:space-y-5 md:space-y-6">
                        <h2 className="text-sm sm:text-base md:text-lg lg:text-xl font-medium text-blue-600 leading-relaxed border-l-4 border-blue-500 pl-3 sm:pl-4">
                            4.2 โดยรวมแล้วคุณคิดว่าสุขภาพของคุณเป็นอย่างไร
                        </h2>
                        <div id={k42.key}
                            className={`space-y-2 p-3 sm:p-4 md:p-5 rounded-lg transition-all duration-200 ${showValidation && k42.is_required && !answers[k42.key] ? 'bg-red-50 border-2 border-red-200' : 'bg-gray-50'}`}>
                            {(k42.options || []).map((o: any) => (
                                <div key={o.id}
                                    onClick={() => setValue(k42.key, o.value)}
                                    className={`flex items-center p-2 sm:p-2.5 md:p-3 border rounded-md cursor-pointer transition-all duration-200 ${answers[k42.key] === o.value ? 'bg-blue-50 border-blue-300 shadow-sm' : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-blue-300 hover:shadow-sm'}`}>
                                    <div className={`w-4 h-4 border-2 rounded-full flex items-center justify-center ${answers[k42.key] === o.value ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white'}`}>
                                        {answers[k42.key] === o.value && <div className="w-2 h-2 bg-white rounded-full" />}
                                    </div>
                                    <span className={`ml-2 text-sm ${answers[k42.key] === o.value ? 'text-blue-700 font-medium' : 'text-gray-700'}`}>
                                        {t(o.label_json, locale)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {k43 && (
                    <div className="space-y-4 sm:space-y-5 md:space-y-6">
                        <h2 className="text-sm sm:text-base md:text-lg lg:text-xl font-medium text-blue-600 leading-relaxed border-l-4 border-blue-500 pl-3 sm:pl-4">
                            4.3 คุณคิดว่าช่วงนี้คุณสามารถใช้ชีวิตประจำวันได้ตามปกติหรือไม่
                        </h2>
                        <div id={k43.key}
                            className={`space-y-2 p-3 sm:p-4 md:p-5 rounded-lg transition-all duration-200 ${showValidation && k43.is_required && !answers[k43.key] ? 'bg-red-50 border-2 border-red-200' : 'bg-gray-50'}`}>
                            {(k43.options || []).map((o: any) => (
                                <div key={o.id}
                                    onClick={() => setValue(k43.key, o.value)}
                                    className={`flex items-center p-2 sm:p-2.5 md:p-3 border rounded-md cursor-pointer transition-all duration-200 ${answers[k43.key] === o.value ? 'bg-blue-50 border-blue-300 shadow-sm' : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-blue-300 hover:shadow-sm'}`}>
                                    <div className={`w-4 h-4 border-2 rounded-full flex items-center justify-center ${answers[k43.key] === o.value ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white'}`}>
                                        {answers[k43.key] === o.value && <div className="w-2 h-2 bg-white rounded-full" />}
                                    </div>
                                    <span className={`ml-2 text-sm ${answers[k43.key] === o.value ? 'text-blue-700 font-medium' : 'text-gray-700'}`}>
                                        {t(o.label_json, locale)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    /* ===================== Section 5: ST5 ===================== */
    const st5 = ordered.find(s => s?.key === 'st5');
    const st5Score = sumScores(st5?.fields || [], answers);
    const st5Level = useMemo(() => {
        const cfg = st5?.calc_json || {};
        const rng = (cfg.ranges || []).find((r: any) => st5Score >= r.min && st5Score <= r.max);
        return rng?.label || '';
    }, [st5, st5Score]);

    const renderST5 = () => {
        if (!st5) return null;
        const first = st5.fields[0];
        const cols = first?.options || [];
        const badge =
            st5Score <= 4 ? 'bg-green-100 text-green-800'
                : st5Score <= 7 ? 'bg-yellow-100 text-yellow-800'
                    : st5Score <= 9 ? 'bg-orange-100 text-orange-800'
                        : 'bg-red-100 text-red-800';

        return (
            <div className="space-y-6">
                <div className="space-y-2 bg-blue-50 p-3 sm:p-4 md:p-5 rounded-lg border-l-4 border-blue-500 text-xs sm:text-sm text-gray-700">
                    <div className="font-medium text-blue-800">คำแนะนำ</div>
                    <div>โปรดประเมินความรู้สึกในช่วง 2–4 สัปดาห์ที่ผ่านมา และเลือกคะแนน 0–3 ให้ตรงกับอารมณ์ของคุณมากที่สุด</div>
                </div>

                {/* Mobile View: Cards with Buttons */}
                <div className="block md:hidden space-y-4">
                    {st5.fields.map((f: any) => {
                        const isAnswered = !!answers[f.key];
                        const isHighlighted = showValidation && f.is_required && !isAnswered;
                        return (
                            <div key={f.id} id={f.key} className={`p-4 rounded-lg border ${isHighlighted ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'} shadow-sm`}>
                                <div className="font-medium text-gray-800 mb-3 text-sm">
                                    {t(f.label_json, locale)}
                                    {isHighlighted && <AlertCircle className="w-4 h-4 text-red-500 inline-block ml-2" />}
                                </div>
                                <div className="flex justify-between gap-2">
                                    {cols.map((o: any) => (
                                        <button
                                            key={o.id}
                                            type="button"
                                            onClick={() => setValue(f.key, o.value)}
                                            className={`flex-1 py-2.5 rounded-lg border font-medium transition-all ${answers[f.key] === o.value
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-105'
                                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                                }`}
                                        >
                                            {o.value}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Desktop View: Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full border-collapse bg-gray-50 rounded-lg shadow-sm">
                        <thead>
                            <tr className="bg-gray-100 border-b border-gray-200">
                                <th className="p-2 text-left text-xs sm:text-sm font-semibold text-gray-700 min-w-[180px]">รายการ</th>
                                {cols.map((o: any) => (
                                    <th key={o.id} className="p-1 text-center text-xs sm:text-sm font-semibold text-gray-700 min-w-[60px]">
                                        {t(o.label_json, locale).split(' ')[0]}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {st5.fields.map((f: any) => {
                                const isAnswered = !!answers[f.key];
                                const isHighlighted = showValidation && f.is_required && !isAnswered;
                                return (
                                    <tr key={f.id} id={f.key}
                                        className={`border-b border-gray-200 last:border-b-0 transition-all duration-200 ${isHighlighted ? 'bg-red-50' : 'hover:bg-white'}`}>
                                        <td className="p-2 text-xs sm:text-sm text-gray-800 font-medium">
                                            {t(f.label_json, locale)}
                                            {isHighlighted && <AlertCircle className="w-4 h-4 text-red-500 inline-block ml-2" />}
                                        </td>
                                        {cols.map((o: any) => (
                                            <td key={o.id} className="p-0.5 text-center">
                                                <div
                                                    onClick={() => setValue(f.key, o.value)}
                                                    className={`flex items-center justify-center w-full h-full py-1 px-0.5 rounded-md cursor-pointer transition-all duration-200 border-2 ${answers[f.key] === o.value ? 'bg-blue-100 border-blue-500' : 'border-transparent hover:bg-blue-50 hover:border-blue-200'}`}
                                                >
                                                    <div className={`w-3 h-3 border-2 rounded-full flex items-center justify-center ${answers[f.key] === o.value ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white'}`}>
                                                        {answers[f.key] === o.value && <div className="w-1 h-1 bg-white rounded-full" />}
                                                    </div>
                                                </div>
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="bg-gray-50 p-3 sm:p-4 md:p-5 rounded-lg border-l-4 border-gray-400 space-y-2">
                    <div className="text-sm sm:text-base font-medium">ผลการประเมิน</div>
                    <div className="text-xs sm:text-sm text-gray-700">
                        <span className="font-medium">คะแนนรวม:</span>{' '}
                        <span className={`inline-block px-2 py-1 rounded-md font-bold ${badge}`}>{st5Score}</span>
                    </div>
                    {st5Level && (
                        <div className="text-xs sm:text-sm text-gray-700">
                            <span className="font-medium">ระดับความเครียด:</span>{' '}
                            <span className={`inline-block px-2 py-1 rounded-md font-bold ${badge}`}>{st5Level}</span>
                        </div>
                    )}
                    {st5Score >= 10 && (
                        <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded-lg text-red-700 text-xs sm:text-sm font-medium">
                            ⚠️ หมายเหตุ: ควรพบที่ปรึกษาเพื่อรับคำแนะนำ
                        </div>
                    )}
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-gray-700">
                        <div className="flex items-center gap-2 p-2 bg-white rounded border"><span className="w-9 h-9 bg-green-100 text-green-800 rounded-full flex items-center justify-center text-xs font-bold">0-4</span><span>ความเครียดน้อย</span></div>
                        <div className="flex items-center gap-2 p-2 bg-white rounded border"><span className="w-9 h-9 bg-yellow-100 text-yellow-800 rounded-full flex items-center justify-center text-xs font-bold">5-7</span><span>ความเครียดปานกลาง</span></div>
                        <div className="flex items-center gap-2 p-2 bg-white rounded border"><span className="w-9 h-9 bg-orange-100 text-orange-800 rounded-full flex items-center justify-center text-xs font-bold">8-9</span><span>ความเครียดมาก</span></div>
                        <div className="flex items-center gap-2 p-2 bg-white rounded border"><span className="w-9 h-9 bg-red-100 text-red-800 rounded-full flex items-center justify-center text-xs font-bold">10-15</span><span>ความเครียดมากที่สุด</span></div>
                    </div>
                </div>
            </div>
        );
    };

    /* ===================== SUMMARY (ใหม่) ===================== */
    const renderSummary = () => {
        const height = Number(answers['height_cm']);
        const weight = Number(answers['weight_kg']);
        const { bmi: bmiValue, status: bmiStatus } = bmi(height, weight);
        const bsaValue = bsaMosteller(height, weight);
        const bsaTxt = bsaStatusText(bsaValue);

        const Card = ({
            title, score, max, img, msg,
        }: { title: string; score: number; max: number; img: string; msg: string }) => {
            const pct = (score / max) * 100;
            const cls =
                pct <= 33 ? 'bg-green-100 text-green-800 border-green-300'
                    : pct <= 66 ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                        : 'bg-red-100 text-red-800 border-red-300';
            return (
                <div className={`border-2 rounded-xl p-5 ${cls}`}>
                    <div className="flex items-center gap-2 mb-3">
                        <Image src={img} alt="" width={20} height={20} />
                        <h3 className="font-semibold">{title}</h3>
                    </div>
                    <div className="text-3xl font-bold mb-2">{score} / {max}</div>
                    <p className="text-sm leading-relaxed">{msg}</p>
                </div>
            );
        };

        return (
            <div className="space-y-8">
                {/* Diet summary */}
                <div>
                    <h2 className="text-xl font-bold text-gray-800 mb-4">ส่วนที่ 3: พฤติกรรมการบริโภค</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card
                            title="การบริโภคหวาน"
                            score={diet31Score}
                            max={15}
                            img="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/candies-yHU2GBvOgqIfboeGIzin1EXolXzbwE.png"
                            msg={getScoreMessage(diet31Score, 'sugar')}
                        />
                        <Card
                            title="การบริโภคไขมัน"
                            score={diet32Score}
                            max={15}
                            img="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/fat-V7zwtwaZDVOgykfi60KxdXiVoOWQlV.png"
                            msg={getScoreMessage(diet32Score, 'fat')}
                        />
                        <Card
                            title="การบริโภคโซเดียม"
                            score={diet33Score}
                            max={15}
                            img="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/sodium-XtUm0VmipFjvKOQF95kFkwRsDEuzEf.png"
                            msg={getScoreMessage(diet33Score, 'sodium')}
                        />
                    </div>
                </div>

                {/* ST-5 summary */}
                <div>
                    <h2 className="text-xl font-bold text-gray-800 mb-4">ส่วนที่ 5: ความเครียด</h2>
                    <div className="border-2 rounded-xl p-6">
                        <div className="text-center mb-4">
                            <div className="text-4xl font-bold mb-2">{st5Score} / 15</div>
                            <div className="text-lg font-semibold">{st5Level || '-'}</div>
                        </div>
                        {st5Score >= 10 && (
                            <div className="mt-4 pt-4 border-t border-red-300">
                                <p className="text-sm font-medium text-center text-red-700">
                                    ระดับความเครียดค่อนข้างสูง แนะนำปรึกษาผู้เชี่ยวชาญ
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* BMI/BSA */}
                <div>
                    <h2 className="text-xl font-bold text-gray-800 mb-4">สรุปตัวชี้วัดร่างกาย</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl border bg-gray-50">
                            <div className="text-sm text-gray-700"><span className="font-medium">BMI:</span> {bmiValue ?? '-'} {bmiStatus ? `(${bmiStatus})` : ''}</div>
                        </div>
                        <div className="p-4 rounded-xl border bg-gray-50">
                            <div className="text-sm text-gray-700"><span className="font-medium">BSA:</span> {bsaValue ?? '-'} {bsaTxt ? `(${bsaTxt})` : ''}</div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    /* -------------------- Layout -------------------- */
    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-100 via-white to-blue-100 px-4 py-10 flex justify-center font-sans">
            <div className="w-full max-w-sm sm:max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-5xl bg-white min-h-screen shadow-lg flex flex-col">
                {/* Header */}
                <div className="bg-white border-b shadow-sm">
                    <div className="flex items-center p-3 sm:p-4 md:p-5 lg:p-6">
                        <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-medium text-gray-900 leading-tight">
                            {t(sec?.title_json, locale) || 'ฟอร์ม'}
                        </h1>
                    </div>

                    {/* Progress */}
                    <div className="px-3 sm:px-4 md:px-5 lg:px-6 pb-3">
                        <div className="flex justify-between items-center text-xs sm:text-sm text-gray-600">
                            {sec?.key === 'summary'
                                ? <span>ตรวจทานก่อนส่ง</span>
                                : <span>ความคืบหน้า: {answeredRequired}/{totalRequired}</span>}
                            <span>{progressPct}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                            <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
                        </div>
                    </div>

                    {/* Validation */}
                    {showValidation && sec?.key !== 'summary' && (
                        <div className="mx-3 sm:mx-4 md:mx-5 lg:mx-6 mb-3 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="text-sm font-medium text-red-800">กรุณาตอบคำถามให้ครบทุกข้อ</h3>
                                    <p className="text-xs text-red-700 mt-1">บางข้อยังไม่ได้เลือก</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex-grow p-3 sm:p-4 md:p-5 lg:p-6 xl:p-8 space-y-6 sm:space-y-7 md:space-y-8 lg:space-y-10">
                    {sec?.key === 'general' && renderGeneral()}
                    {sec?.key === 'diet' && (
                        <>
                            {renderDietTable('diet31', '3.1 ประเมินนิสัยการบริโภคหวาน', 'sugar')}
                            {renderDietTable('diet32', '3.2 ประเมินนิสัยการบริโภคไขมัน', 'fat')}
                            {renderDietTable('diet33', '3.3 ประเมินนิสัยการบริโภคโซเดียม', 'sodium')}
                        </>
                    )}
                    {sec?.key === 'knowledge' && renderKnowledge()}
                    {sec?.key === 'st5' && renderST5()}
                    {sec?.key === 'summary' && renderSummary()}
                </div>

                {/* Nav Buttons */}
                <div className="bg-white border-t shadow-sm w-full mx-auto p-4 sm:p-5 md:p-6 lg:p-8">
                    <div className="flex justify-between items-center">
                        <button
                            onClick={goPrev}
                            disabled={step === 0}
                            className="flex items-center px-5 sm:px-6 md:px-7 lg:px-9 py-3 sm:py-3.5 md:py-4 lg:py-5 bg-gray-200 text-gray-700 rounded-md sm:rounded-lg hover:bg-gray-300 transition-colors text-sm sm:text-base md:text-lg lg:text-xl font-medium shadow-lg hover:shadow-xl disabled:opacity-50"
                        >
                            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 mr-2 sm:mr-2.5" />
                            <span>กลับ</span>
                        </button>

                        {step < ordered.length - 1 ? (
                            <button
                                onClick={goNext}
                                className={`flex items-center px-6 sm:px-7 md:px-8 lg:px-10 py-3 sm:py-3.5 md:py-4 lg:py-5 rounded-md sm:rounded-lg transition-colors text-sm sm:text-base md:text-lg lg:text-xl font-medium shadow-lg hover:shadow-xl ${sec?.key === 'summary' || answeredRequired === totalRequired ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500'}`}
                            >
                                <span>ถัดไป</span>
                                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 ml-2 sm:ml-2.5" />
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="flex items-center px-6 sm:px-7 md:px-8 lg:px-10 py-3 sm:py-3.5 md:py-4 lg:py-5 rounded-md sm:rounded-lg transition-colors text-sm sm:text-base md:text-lg lg:text-xl font-medium shadow-lg hover:shadow-xl bg-green-600 text-white hover:bg-green-700"
                            >
                                ยืนยันและส่ง
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
