import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// === اینجا اطلاعات Supabase خودت را وارد کن ===
const supabaseUrl = 'https://ihbsxjgzrhnssluqooqh.supabase.co'   // Project URL
const supabaseKey = 'sb_publishable_hHyHJI5JkxgLNrXAwZrGWQ_vbD3kdrj'                 // Anon public key

const supabase = createClient(supabaseUrl, supabaseKey)

let currentJobId = null
const logsDiv = document.getElementById('logs')

async function startMonitoring() {
    const target_url = document.getElementById('url').value.trim()
    const check_count = parseInt(document.getElementById('count').value)
    const interval_ms = parseInt(document.getElementById('interval').value)

    if (!target_url || !target_url.startsWith('http')) {
        alert('لطفاً یک لینک معتبر وارد کنید (مثل https://example.com)')
        return
    }

    if (check_count < 1 || interval_ms < 1000) {
        alert('تعداد چک حداقل ۱ و فاصله حداقل ۱۰۰۰ میلی‌ثانیه باشد')
        return
    }

    // ایجاد job جدید
    const { data: job, error: jobError } = await supabase
        .from('monitoring_jobs')
        .insert({
            target_url: target_url,
            check_count: check_count,
            interval_ms: interval_ms,
            status: 'running'
        })
        .select()
        .single()

    if (jobError) {
        console.error(jobError)
        alert('خطا در ایجاد job: ' + jobError.message)
        return
    }

    currentJobId = job.id
    logsDiv.innerHTML = `<p>✅ job ایجاد شد. شروع چک...</p>`

    // فراخوانی Edge Function برای چک کردن
    const { error: funcError } = await supabase.functions.invoke('check-uptime', {
        body: { 
            job_id: job.id, 
            target_url: target_url, 
            check_count: check_count, 
            interval_ms: interval_ms 
        }
    })

    if (funcError) {
        console.error(funcError)
        logsDiv.innerHTML += `<p>⚠️ خطا در شروع چک: ${funcError.message}</p>`
    }

    // Realtime دریافت لاگ‌ها
    supabase
        .channel(`logs-${job.id}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'check_logs',
                filter: `job_id=eq.${job.id}`
            },
            (payload) => {
                const log = payload.new
                const time = new Date(log.timestamp).toLocaleTimeString('fa-IR')
                const emoji = log.status === 'up' ? '✅' : '❌'
                const row = `<p>${time} \( {emoji} وضعیت: <b> \){log.status}</b> (${log.response_time || '?'}ms)</p>`
                logsDiv.innerHTML += row
                logsDiv.scrollTop = logsDiv.scrollHeight
            }
        )
        .subscribe()
}

// برای تست در کنسول مرورگر
window.startMonitoring = startMonitoring
