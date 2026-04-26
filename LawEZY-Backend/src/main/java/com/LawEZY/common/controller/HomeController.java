package com.LawEZY.common.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.MediaType;

@RestController
public class HomeController {

    @GetMapping(value = "/", produces = MediaType.TEXT_HTML_VALUE)
    public String home() {
        return "<!DOCTYPE html>" +
               "<html lang='en'>" +
               "<head>" +
               "    <meta charset='UTF-8'>" +
               "    <meta name='viewport' content='width=device-width, initial-scale=1.0'>" +
               "    <title>LawEZY | Institutional API Engine</title>" +
               "    <style>" +
               "        body { margin: 0; padding: 0; font-family: 'Inter', system-ui, -apple-system, sans-serif; " +
               "               background: radial-gradient(circle at top right, #0f172a, #020617); " +
               "               color: white; height: 100vh; display: flex; align-items: center; justify-content: center; overflow: hidden; }" +
               "        .glass { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(12px); " +
               "                 border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 24px; " +
               "                 padding: 3rem; text-align: center; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); " +
               "                 max-width: 500px; width: 90%; animation: fadeIn 1s ease-out; }" +
               "        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }" +
               "        h1 { font-size: 2.5rem; margin-bottom: 0.5rem; background: linear-gradient(to right, #60a5fa, #a855f7); " +
               "             -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 800; }" +
               "        p { color: #94a3b8; line-height: 1.6; margin-bottom: 2rem; }" +
               "        .status { display: inline-flex; align-items: center; gap: 0.5rem; background: rgba(34, 197, 94, 0.1); " +
               "                  color: #4ade80; padding: 0.5rem 1rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 600; " +
               "                  margin-bottom: 1.5rem; border: 1px solid rgba(34, 197, 94, 0.2); }" +
               "        .dot { width: 8px; height: 8px; background: #22c55e; border-radius: 50%; box-shadow: 0 0 10px #22c55e; animation: pulse 2s infinite; }" +
               "        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }" +
               "        .btn { display: inline-block; background: white; color: #020617; padding: 0.75rem 1.5rem; " +
               "               border-radius: 12px; text-decoration: none; font-weight: 700; transition: all 0.2s; " +
               "               box-shadow: 0 10px 15px -3px rgba(255, 255, 255, 0.1); }" +
               "        .btn:hover { transform: translateY(-2px); box-shadow: 0 20px 25px -5px rgba(255, 255, 255, 0.2); }" +
               "    </style>" +
               "</head>" +
               "<body>" +
               "    <div class='glass'>" +
               "        <div class='status'><span class='dot'></span> Institutional API Active</div>" +
               "        <h1>LawEZY Engine</h1>" +
               "        <p>Elite Legal Intelligence & AI Infrastructure.<br>The backend services are synchronized and running on Render AP-South.</p>" +
               "        <a href='https://www.lawezy.in/' class='btn'>Launch App Portal</a>" +
               "    </div>" +
               "</body>" +
               "</html>";
    }
}
