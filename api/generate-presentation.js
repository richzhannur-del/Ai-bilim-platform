export default async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).json({
            error: "POST әдісі қажет."
        });
    }

    try {

        const {
            subject,
            grade,
            topic,
            learningObjective
        } = req.body || {};

        if (!subject || !grade || !topic) {
            return res.status(400).json({
                error: "Пән, сынып және тақырып міндетті."
            });
        }

        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                error: "OPENAI_API_KEY орнатылмаған."
            });
        }

        const prompt = `
Сен Қазақстан мектебінің тәжірибелі педагогі,
әдіскері және заманауи презентация авторысың.

Мұғалімге арналған сабақ презентациясының мазмұнын жаса.

Пән: ${subject}
Сынып: ${grade}
Сабақ тақырыбы: ${topic}
Оқу мақсаты: ${learningObjective || "тақырыпқа сәйкес анықта"}

Презентация қазақ тілінде болуы керек.

ДӘЛ 7 СЛАЙД жаса.

МАЗМҰН ТАЛАПТАРЫ:

1-СЛАЙД — ТИТУЛ
- сабақ тақырыбы;
- пән және сынып;
- қысқа мотивациялық сөйлем.

2-СЛАЙД — ОҚУ МАҚСАТЫ
- оқу мақсаты;
- сабақ мақсаты;
- оқушы сабақ соңында не үйренетінін 3 тармақпен көрсет.

3-СЛАЙД — НЕГІЗГІ ҰҒЫМДАР
- тақырып бойынша 3–5 негізгі ұғым;
- әр ұғымға өте қысқа түсініктеме.

4-СЛАЙД — ТАҚЫРЫПТЫ ТҮСІНДІРУ
- тақырыптың негізгі мазмұны;
- 3–5 маңызды факт;
- оқушы жасына сәйкес түсінікті тіл.

5-СЛАЙД — НАҚТЫ МЫСАЛ
Пәнге бейімде:

Қазақстан тарихы немесе дүниежүзі тарихы болса:
нақты тарихи оқиға, дата, тұлға, себеп-салдар.

Информатика болса:
алгоритм, код немесе цифрлық мысал.

Математика/физика болса:
формула, есеп және шешу мысалы.

Химия болса:
реакция немесе тәжірибе.

Биология болса:
биологиялық процесс немесе құрылым.

География болса:
карта, аймақ, табиғи процесс немесе дерек.

Тіл/әдебиет болса:
мәтін, сөйлем, шығарма немесе тілдік мысал.

6-СЛАЙД — ОҚУШЫ ТАПСЫРМАСЫ
- тақырыпқа нақты тапсырма;
- орындау нұсқаулығы;
- кемінде 3 дескриптор;
- қысқа қалыптастырушы бағалау.

7-СЛАЙД — ҚОРЫТЫНДЫ ЖӘНЕ РЕФЛЕКСИЯ
- сабақ бойынша 3 негізгі қорытынды;
- 2 рефлексия сұрағы;
- қысқа қорытынды сөйлем.

МАҢЫЗДЫ:
- Жалпы сөздер жазба.
- Ақпарат дәл ${topic} тақырыбына қатысты болсын.
- ${grade}-сынып оқушысының жас ерекшелігін ескер.
- Әр слайдтағы мәтін презентацияға лайық қысқа болсын.
- Бір слайдты ұзын мәтінмен толтырма.
- Фактілерді ойдан шығарма.

ӘР СЛАЙД ҮШІН:
"title" — слайд тақырыбы;
"subtitle" — қысқа қосымша мәтін;
"bullets" — негізгі 3–5 тармақ;
"visualSuggestion" — қандай визуал қажет екенін қазақша жаз;
"highlight" — слайдта үлкен етіп ерекшеленетін қысқа факт немесе сөз.

ТЕК жарамды JSON қайтар.
Markdown және код қоршауын қолданба.

JSON құрылымы:

{
  "presentationTitle": "",
  "subject": "",
  "grade": "",
  "topic": "",
  "slides": [
    {
      "number": 1,
      "title": "",
      "subtitle": "",
      "bullets": [],
      "visualSuggestion": "",
      "highlight": ""
    }
  ]
}

slides массивінде ДӘЛ 7 слайд болсын.
`;

        const response = await fetch(
            "https://api.openai.com/v1/responses",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },

                body: JSON.stringify({
                    model: "gpt-6-luna",
                    input: prompt
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {

            console.error(
                "OpenAI presentation error:",
                data
            );

            return res.status(response.status).json({
                error:
                    data?.error?.message ||
                    "ЖИ презентация жасау кезінде қате жіберді."
            });
        }

        let text = "";

        for (const item of data.output || []) {

            if (item.type !== "message") {
                continue;
            }

            for (const content of item.content || []) {

                if (
                    content.type === "output_text" &&
                    content.text
                ) {
                    text += content.text;
                }
            }
        }

        if (!text) {
            throw new Error(
                "ЖИ презентация мазмұнын қайтармады."
            );
        }

        // Егер ЖИ ```json ... ``` қайтарса тазалаймыз
        text = text
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();

        let presentation;

        try {
            presentation = JSON.parse(text);
        } catch (parseError) {

            console.error(
                "JSON parse error:",
                text
            );

            throw new Error(
                "Презентация деректерін оқу мүмкін болмады. Қайта жасап көріңіз."
            );
        }

        if (!Array.isArray(presentation.slides)) {
            throw new Error(
                "Презентация слайдтары табылмады."
            );
        }

        if (presentation.slides.length !== 7) {
            throw new Error(
                "ЖИ дәл 7 слайд жасамады. Қайта жасап көріңіз."
            );
        }

        return res.status(200).json({
            success: true,
            presentation
        });

    } catch (error) {

        console.error(
            "generate-presentation error:",
            error
        );

        return res.status(500).json({
            error:
                error.message ||
                "Презентация жасау кезінде қате пайда болды."
        });
    }
}
