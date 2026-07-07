import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const supabaseUrl = 'https://ihbsxjgzrhnssluqooqh.supabase.co'
const supabaseKey = 'sb_publishable_hHyHJI5JkxgLNrXAwZrGWQ_vbD3kdrj'

const supabase = createClient(supabaseUrl, supabaseKey)

let activeJobId = null
let logsDiv = document.getElementById('logs')
let activeJobsDiv = document.getElementById('active-jobs')

async function startMonitoring() {
    const target_url = document.getElementById('url').value.trim()
    let check_count = parseInt(document.getElementById('count').value)
    let interval_ms = parseInt(document.getElementById('interval').value)

    if (!target_url) return alert('لینک سایت را وارد کنید')

    const { data: job } = await supabase.from('monitoring_jobs').insert({
        target_url,
        check_count,
        interval_ms,
        status: 'running'
    }).select().single()

    activeJobId = job.id

    logsDiv.innerHTML = `<p class="progress">✅ job شروع شد - در حال بررسی...</p>`

    // فراخوانی Edge Function
    supabase.functions.invoke('check-uptime', {
        body: { job_id: job.id, target_url, check_count, interval_ms }
    })

    // Realtime
    supabase.channel(`job-${job.id}`).on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'check_logs',
        filter: `job_id=eq.${job.id}`
    }, (payload) => {
        const log = payload.new
        const time = new Date(log.timestamp).toLocaleTimeString('fa-IR')
        const emoji = log.status === 'up' ? '✅' : '❌'
        
        logsDiv.innerHTML += `<div class="log">${time} ${emoji} \( {log.status} ( \){log.response_time}ms)</div>`
        logsDiv.scrollTop = logsDiv.scrollHeight

        // نمایش پیشرفت
        const progress = logsDiv.getElementsByClassName('log').length
        if (progress % 5 === 0) {
            logsDiv.innerHTML = `<p class="progress">در حال انجام: \( {progress}/ \){check_count}</p>` + logsDiv.innerHTML
        }
    }).subscribe()
}

window.startMonitoring = startMonitoring
