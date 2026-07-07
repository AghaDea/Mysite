import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const supabaseUrl = 'https://ihbsxjgzrhnssluqooqh.supabase.co'
const supabaseKey = 'sb_publishable_hHyHJI5JkxgLNrXAwZrGWQ_vbD3kdrj'

const supabase = createClient(supabaseUrl, supabaseKey)

async function startBackgroundCheck() {
    const target_url = document.getElementById('url').value.trim()
    const check_count = parseInt(document.getElementById('count').value) || 50
    const interval_ms = parseInt(document.getElementById('interval').value) || 3000

    if (!target_url) return alert('لینک را وارد کنید')

    // فقط job ایجاد کن و به Edge Function بگو شروع کند
    const { data: job } = await supabase
        .from('monitoring_jobs')
        .insert({ target_url, check_count, interval_ms, status: 'running' })
        .select()
        .single()

    alert(`✅ Job شماره ${job.id} شروع شد.\n\nحتی اگر صفحه را ببندی، چک ادامه دارد (تا حد Edge Function).`)

    // شروع تابع سمت سرور
    supabase.functions.invoke('check-uptime', {
        body: { job_id: job.id, target_url, check_count, interval_ms }
    })
}

// بارگذاری jobهای فعال قبلی
async function loadActiveJobs() {
    const { data } = await supabase.from('monitoring_jobs').select('*').eq('status', 'running')
    // نمایش jobها...
}

window.startBackgroundCheck = startBackgroundCheck
