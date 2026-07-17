# PowerShell script to download all high-fidelity HTML screens from Stitch project

# Create output folder
$screensDir = "e:\Ai code review\screens"
if (!(Test-Path -Path $screensDir)) {
    New-Item -ItemType Directory -Force -Path $screensDir
}

# Screens list with download URLs and target filenames
$screens = @(
    @{
        name = "landing_page_desktop.html"
        url = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sX2Q0ZTg2MWZjN2ZjYTRkYzViNzQxNmE4NTVlY2VjNzc5EgsSBxDnrYL2oxoYAZIBIwoKcHJvamVjdF9pZBIVQhM2OTMxMDQzNzg1ODA4MTM4MDA3&filename=&opi=96797242"
    },
    @{
        name = "landing_page_mobile.html"
        url = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzRhMjY1ZTAxMjZlZDQ1ODI4ZDFjMjYxNzM2ZTY4M2IzEgsSBxDnrYL2oxoYAZIBIwoKcHJvamVjdF9pZBIVQhM2OTMxMDQzNzg1ODA4MTM4MDA3&filename=&opi=96797242"
    },
    @{
        name = "code_submission_desktop.html"
        url = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sX2I5YjFjN2E3MjgzZjRiYmY5YzQzM2I3N2ZhNjg5OGFiEgsSBxDnrYL2oxoYAZIBIwoKcHJvamVjdF9pZBIVQhM2OTMxMDQzNzg1ODA4MTM4MDA3&filename=&opi=96797242"
    },
    @{
        name = "code_submission_mobile.html"
        url = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzdjMmE1MmM5ZGJiODRmMWRhZWUzYjFkNDlmOTA2YzI5EgsSBxDnrYL2oxoYAZIBIwoKcHJvamVjdF9pZBIVQhM2OTMxMDQzNzg1ODA4MTM4MDA3&filename=&opi=96797242"
    },
    @{
        name = "review_results_desktop.html"
        url = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzQyMjcwMTljZTk0YjQ1MWQ5YzZiMmQwNjY3OTgwYzE4EgsSBxDnrYL2oxoYAZIBIwoKcHJvamVjdF9pZBIVQhM2OTMxMDQzNzg1ODA4MTM4MDA3&filename=&opi=96797242"
    },
    @{
        name = "review_results_mobile.html"
        url = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sX2NlMWFhYzVhMmZkOTRiOGU4ZTNmMDJmN2U4MDhkMjU3EgsSBxDnrYL2oxoYAZIBIwoKcHJvamVjdF9pZBIVQhM2OTMxMDQzNzg1ODA4MTM4MDA3&filename=&opi=96797242"
    },
    @{
        name = "review_history_desktop.html"
        url = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzRmOGZiNmQ4MDQ1ODQzM2JiZDViMjkwZGJkYTdjOWVjEgsSBxDnrYL2oxoYAZIBIwoKcHJvamVjdF9pZBIVQhM2OTMxMDQzNzg1ODA4MTM4MDA3&filename=&opi=96797242"
    },
    @{
        name = "review_history_mobile.html"
        url = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzJlYjRhMjM5MDVjMTQyMDU5MzMxNjZhZjI5Y2NhZDJlEgsSBxDnrYL2oxoYAZIBIwoKcHJvamVjdF9pZBIVQhM2OTMxMDQzNzg1ODA4MTM4MDA3&filename=&opi=96797242"
    },
    @{
        name = "auth_screen_desktop.html"
        url = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzc3ZjEzZjgxMTg4ZjQxMWY5YzI0NGQwZDQwMGM4NzA0EgsSBxDnrYL2oxoYAZIBIwoKcHJvamVjdF9pZBIVQhM2OTMxMDQzNzg1ODA4MTM4MDA3&filename=&opi=96797242"
    }
)

foreach ($screen in $screens) {
    $outputPath = Join-Path $screensDir $screen.name
    Write-Host "Downloading $($screen.name)..."
    try {
        Invoke-WebRequest -UseBasicParsing -Uri $screen.url -OutFile $outputPath
        Write-Host "Successfully saved to $outputPath"
    } catch {
        Write-Error "Failed to download $($screen.name): $_"
    }
}

Write-Host "All downloads complete!"
