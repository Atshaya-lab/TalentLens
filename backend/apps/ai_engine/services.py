import google.generativeai as genai
from django.conf import settings
import json
import re
import logging
from typing import List, Tuple, Dict

logger = logging.getLogger(__name__)

class GeminiService:
    """Service for interacting with Google Gemini AI"""
    
    def __init__(self):
        genai.configure(api_key=settings.GEMINI_API_KEY)
        # Use the correct model name for the current API
        self.model = genai.GenerativeModel('gemini-1.5-flash')
    
    def generate_interview_questions(self, resume_content: str, interview_type: str, num_questions: int = 10) -> List[str]:
        """Generate interview questions based on resume and interview type"""
        
        prompt = self._build_question_prompt(resume_content, interview_type, num_questions)
        
        try:
            response = self.model.generate_content(prompt)
            questions = self._parse_questions_response(response.text, num_questions)
            logger.info(f"Generated {len(questions)} questions for {interview_type} interview")
            return questions
        except Exception as e:
            logger.error(f"Error generating questions: {str(e)}")
            return self._get_fallback_questions(interview_type, num_questions)
    
    def score_answer(self, question: str, answer: str, interview_type: str) -> Tuple[int, str]:
        """Score an interview answer and provide feedback"""
        
        prompt = self._build_scoring_prompt(question, answer, interview_type)
        
        try:
            response = self.model.generate_content(prompt)
            score, feedback = self._parse_scoring_response(response.text)
            logger.info(f"Scored answer: {score}/100")
            return score, feedback
        except Exception as e:
            logger.error(f"Error scoring answer: {str(e)}")
            return self._get_fallback_score(answer)
    
    def analyze_resume_comprehensive(self, resume_content: str) -> Dict:
        """Comprehensive resume analysis using Gemini with structured output"""
        
        # Enhanced prompt for structured analysis
        prompt = f"""
        You are an expert career counselor and resume analyst. Analyze the following resume comprehensively and provide structured feedback.
        
        Resume Content:
        {resume_content}
        
        Provide analysis in the following JSON format (return ONLY valid JSON, no additional text):
        {{
            "skills_extracted": ["list of technical and soft skills found"],
            "technologies": ["list of programming languages, frameworks, tools mentioned"],
            "job_titles": ["list of suitable job titles based on experience"],
            "experience_years": <number representing years of experience>,
            "education_details": ["list of educational qualifications"],
            "overall_score": <integer from 0-100>,
            "content_quality_score": <integer from 0-100>,
            "formatting_score": <integer from 0-100>,
            "keywords_score": <integer from 0-100>,
            "experience_relevance_score": <integer from 0-100>,
            "strengths": ["list of 3-5 key strengths"],
            "weaknesses": ["list of 3-5 areas for improvement"],
            "suggestions": ["list of 5-7 specific actionable suggestions"],
            "recommended_roles": ["list of 3-5 job roles that match the profile"],
            "skill_gaps": ["list of important skills missing for target roles"],
            "market_relevance": "high|medium|low",
            "detailed_analysis": "A comprehensive paragraph explaining the overall assessment, career trajectory, and market positioning"
        }}
        
        Scoring Guidelines:
        - Overall Score: Holistic assessment of the resume's effectiveness
        - Content Quality: Relevance, depth, and impact of content
        - Formatting: Structure, readability, and professional presentation
        - Keywords: Industry-relevant terms and technical vocabulary
        - Experience Relevance: How well experience aligns with career goals
        
        Focus on:
        1. Technical skills and competencies
        2. Project experience and achievements
        3. Educational background relevance
        4. Industry alignment and market demand
        5. Career progression potential
        6. Areas for skill development
        """
        
        try:
            response = self.model.generate_content(prompt)
            analysis_data = self._parse_json_response(response.text)
            
            # Validate and clean the response
            return self._validate_analysis_response(analysis_data)
            
        except Exception as e:
            logger.error(f"Error in comprehensive resume analysis: {str(e)}")
            return self._get_comprehensive_fallback_analysis()

    def _validate_analysis_response(self, analysis_data: Dict) -> Dict:
        """Validate and ensure all required fields are present"""
        
        required_fields = {
            'skills_extracted': [],
            'technologies': [],
            'job_titles': [],
            'experience_years': 0,
            'education_details': [],
            'overall_score': 50,
            'content_quality_score': 50,
            'formatting_score': 50,
            'keywords_score': 50,
            'experience_relevance_score': 50,
            'strengths': [],
            'weaknesses': [],
            'suggestions': [],
            'recommended_roles': [],
            'skill_gaps': [],
            'market_relevance': 'medium',
            'detailed_analysis': 'Analysis could not be completed.'
        }
        
        # Ensure all required fields are present with default values
        for field, default_value in required_fields.items():
            if field not in analysis_data:
                analysis_data[field] = default_value
        
        # Ensure scores are within valid range
        score_fields = ['overall_score', 'content_quality_score', 'formatting_score', 
                       'keywords_score', 'experience_relevance_score']
        
        for field in score_fields:
            if not isinstance(analysis_data[field], int) or analysis_data[field] < 0 or analysis_data[field] > 100:
                analysis_data[field] = 50  # Default score
        
        # Ensure lists are actually lists
        list_fields = ['skills_extracted', 'technologies', 'job_titles', 'education_details',
                      'strengths', 'weaknesses', 'suggestions', 'recommended_roles', 'skill_gaps']
        
        for field in list_fields:
            if not isinstance(analysis_data[field], list):
                analysis_data[field] = []
        
        # Ensure market_relevance is valid
        if analysis_data['market_relevance'] not in ['high', 'medium', 'low']:
            analysis_data['market_relevance'] = 'medium'
        
        return analysis_data

    def _get_comprehensive_fallback_analysis(self) -> Dict:
        """Comprehensive fallback analysis when AI fails"""
        
        return {
            'skills_extracted': ['Problem Solving', 'Communication', 'Teamwork'],
            'technologies': ['Microsoft Office', 'Email', 'Internet'],
            'job_titles': ['Entry Level Professional'],
            'experience_years': 1,
            'education_details': ['Bachelor\'s Degree'],
            'overall_score': 60,
            'content_quality_score': 55,
            'formatting_score': 65,
            'keywords_score': 50,
            'experience_relevance_score': 60,
            'strengths': ['Educational Background', 'Learning Ability', 'Potential for Growth'],
            'weaknesses': ['Limited Work Experience', 'Need More Technical Skills', 'Could Use More Specific Achievements'],
            'suggestions': [
                'Add more specific examples of projects and achievements',
                'Include relevant technical skills and certifications',
                'Quantify accomplishments with numbers and metrics',
                'Highlight leadership and teamwork experiences',
                'Consider adding a professional summary section'
            ],
            'recommended_roles': ['Junior Developer', 'Entry Level Analyst', 'Associate Professional'],
            'skill_gaps': ['Industry-specific technical skills', 'Project management', 'Advanced communication'],
            'market_relevance': 'medium',
            'detailed_analysis': 'This resume shows potential with a solid educational foundation. To strengthen market competitiveness, focus on developing technical skills, gaining practical experience through projects or internships, and clearly articulating achievements with specific examples and quantifiable results.'
        }
    
    def generate_personalized_feedback(self, session_data: Dict) -> str:
        """Generate personalized feedback based on interview session"""
        
        prompt = f"""
        Based on the following interview session data, provide personalized feedback:
        
        Interview Type: {session_data.get('interview_type')}
        Overall Score: {session_data.get('overall_score')}/100
        Questions Asked: {session_data.get('total_questions')}
        
        Question-Answer Analysis:
        {self._format_qa_data(session_data.get('qa_pairs', []))}
        
        Provide comprehensive feedback including:
        1. Overall performance summary
        2. Strengths demonstrated
        3. Areas for improvement
        4. Specific recommendations
        5. Next steps for skill development
        
        Keep the feedback constructive and encouraging.
        """
        
        try:
            response = self.model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            logger.error(f"Error generating feedback: {str(e)}")
            return self._get_fallback_feedback(session_data)
    
    def _build_question_prompt(self, resume_content: str, interview_type: str, num_questions: int) -> str:
        """Build prompt for question generation"""
        
        type_specific_instructions = {
            'technical': 'Focus on technical skills, programming concepts, problem-solving, and technologies mentioned in the resume.',
            'communication': 'Focus on behavioral questions, teamwork, leadership, conflict resolution, and communication skills.',
            'aptitude': 'Focus on logical reasoning, analytical thinking, problem-solving, and cognitive abilities.'
        }
        
        return f"""
        Based on the following resume content, generate {num_questions} {interview_type} interview questions.
        
        Resume Content:
        {resume_content}
        
        Interview Type: {interview_type}
        
        Instructions:
        - {type_specific_instructions.get(interview_type, 'Generate appropriate questions for this interview type.')}
        - Questions should be relevant to the candidate's background and experience level
        - Vary the difficulty level appropriately
        - Make questions specific and actionable
        - Avoid generic questions
        
        Return only the questions as a numbered list, one question per line.
        """
    
    def _build_scoring_prompt(self, question: str, answer: str, interview_type: str) -> str:
        """Build prompt for answer scoring"""
        
        return f"""
        Evaluate the following interview answer and provide a score with detailed feedback.
        
        Question: {question}
        Answer: {answer}
        Interview Type: {interview_type}
        
        Scoring Criteria (Total: 100 points):
        - Relevance and accuracy (25 points)
        - Completeness and depth (25 points)
        - Clarity and communication (25 points)
        - Examples and practical application (25 points)
        
        Provide your response in JSON format:
        {{
            "score": <integer from 0-100>,
            "feedback": "<detailed feedback explaining the score>",
            "strengths": ["strength1", "strength2"],
            "improvements": ["improvement1", "improvement2"]
        }}
        """
    
    def _parse_questions_response(self, response_text: str, num_questions: int) -> List[str]:
        """Parse questions from AI response"""
        
        questions = []
        lines = response_text.strip().split('\n')
        
        for line in lines:
            line = line.strip()
            if line and not line.startswith('#'):
                # Remove numbering and clean up
                question = re.sub(r'^\d+\.?\s*', '', line)
                question = question.strip()
                if question and len(question) > 10:  # Basic validation
                    questions.append(question)
        
        return questions[:num_questions]
    
    def _parse_scoring_response(self, response_text: str) -> Tuple[int, str]:
        """Parse scoring response from AI"""
        
        try:
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group())
                score = int(data.get('score', 0))
                feedback = data.get('feedback', 'No feedback provided')
                return score, feedback
        except:
            pass
        
        # Fallback parsing
        score_match = re.search(r'(\d+)/100|(\d+)\s*points?|score:\s*(\d+)', response_text, re.IGNORECASE)
        if score_match:
            score = int(score_match.group(1) or score_match.group(2) or score_match.group(3))
            return min(max(score, 0), 100), response_text
        
        return 50, response_text
    
    def _parse_json_response(self, response_text: str) -> Dict:
        """Parse JSON response from AI"""
        
        try:
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
        except:
            pass
        
        return self._get_fallback_analysis()
    
    def _format_qa_data(self, qa_pairs: List[Dict]) -> str:
        """Format question-answer pairs for feedback generation"""
        
        formatted = []
        for i, qa in enumerate(qa_pairs, 1):
            formatted.append(f"Q{i}: {qa.get('question', '')}")
            formatted.append(f"A{i}: {qa.get('answer', '')}")
            formatted.append(f"Score: {qa.get('score', 0)}/100")
            formatted.append("")
        
        return "\n".join(formatted)
    
    def _get_fallback_questions(self, interview_type: str, num_questions: int) -> List[str]:
        """Get fallback questions if AI fails"""
        
        fallback_questions = {
            'technical': [
                "Explain your experience with the main programming languages in your resume.",
                "Describe a challenging technical problem you've solved recently.",
                "How do you approach debugging complex issues?",
                "What are your thoughts on code review processes?",
                "Explain a technical concept you've learned recently.",
                "How do you stay updated with new technologies?",
                "Describe your experience with version control systems.",
                "What testing methodologies are you familiar with?",
                "How do you handle database optimization?",
                "Explain your approach to API design."
            ],
            'communication': [
                "Tell me about a time when you had to explain a complex technical concept to a non-technical person.",
                "Describe a situation where you had to work with a difficult team member.",
                "How do you handle disagreements with colleagues?",
                "Tell me about a time when you had to adapt to a significant change at work.",
                "Describe your leadership style and give an example.",
                "How do you prioritize tasks when you have multiple deadlines?",
                "Tell me about a time when you made a mistake and how you handled it.",
                "Describe a situation where you had to work under pressure.",
                "How do you handle feedback and criticism?",
                "Tell me about a time when you had to motivate a team."
            ],
            'aptitude': [
                "If you have 8 balls and one is heavier than the others, how would you find it using a balance scale only twice?",
                "How would you estimate the number of windows in a skyscraper?",
                "Explain how you would design a system to handle a million users.",
                "What would you do if you inherited a legacy codebase with no documentation?",
                "How would you approach learning a completely new technology stack?",
                "Describe your problem-solving process for complex issues.",
                "How would you optimize a slow-performing application?",
                "What factors would you consider when choosing between different solutions?",
                "How would you handle a situation where requirements keep changing?",
                "Describe how you would architect a scalable system."
            ]
        }
        
        questions = fallback_questions.get(interview_type, fallback_questions['technical'])
        return questions[:num_questions]
    
    def _get_fallback_score(self, answer: str) -> Tuple[int, str]:
        """Get fallback score if AI fails"""
        
        # Simple scoring based on answer length and keywords
        score = 50  # Base score
        
        if len(answer) > 100:
            score += 10
        if len(answer) > 200:
            score += 10
        
        # Basic keyword analysis
        positive_keywords = ['experience', 'implement', 'develop', 'manage', 'lead', 'optimize', 'improve']
        for keyword in positive_keywords:
            if keyword.lower() in answer.lower():
                score += 5
        
        score = min(score, 100)
        feedback = f"Your answer demonstrates understanding of the topic. Score: {score}/100. Consider providing more specific examples and details to improve your response."
        
        return score, feedback
    
    def _get_fallback_analysis(self) -> Dict:
        """Get fallback analysis if AI fails"""
        
        return {
            "skills": ["Problem Solving", "Communication", "Teamwork"],
            "experience_years": 2,
            "education": ["Bachelor's Degree"],
            "job_titles": ["Software Developer"],
            "technologies": ["Python", "JavaScript", "SQL"],
            "strengths": ["Technical Skills", "Learning Ability"],
            "areas_for_improvement": ["Leadership", "Public Speaking"],
            "recommended_interview_types": ["technical", "communication"]
        }
    
    def _get_fallback_feedback(self, session_data: Dict) -> str:
        """Get fallback feedback if AI fails"""
        
        score = session_data.get('overall_score', 0)
        interview_type = session_data.get('interview_type', 'general')
        
        if score >= 80:
            performance = "excellent"
        elif score >= 60:
            performance = "good"
        else:
            performance = "needs improvement"
        
        return f"""
        Thank you for completing the {interview_type} interview. Your overall performance was {performance} with a score of {score}/100.
        
        Key takeaways:
        - Continue to build on your strengths
        - Focus on providing specific examples in your answers
        - Practice explaining complex concepts clearly
        - Consider additional preparation for areas where you scored lower
        
        Keep practicing and you'll continue to improve!
        """
    
    def generate_dynamic_questions(self, interview_type: str, difficulty_level: str, 
                                 question_count: int, time_available: int, 
                                 student_profile: dict, session_context: dict) -> List[dict]:
        """Generate dynamic questions with time allocations for professional interview"""
        
        prompt = f"""
        You are an expert interview designer. Generate {question_count} interview questions based on these parameters:
        
        Interview Type: {interview_type}
        Difficulty Level: {difficulty_level}
        Total Time Available: {time_available} seconds
        Student Profile: {json.dumps(student_profile, default=str)}
        
        Requirements:
        1. Generate exactly {question_count} questions
        2. Vary difficulty progressively (start easier, increase complexity)
        3. Include realistic time estimates for each question
        4. Provide evaluation criteria for each question
        5. Ensure questions are relevant to {interview_type} interviews
        
        Return ONLY a valid JSON array with this exact structure:
        [
          {{
            "text": "Your detailed question here",
            "difficulty": "easy/medium/hard",
            "category": "{interview_type}",
            "time_limit": 300,
            "expected_length": "short/medium/long",
            "criteria": {{
              "technical_accuracy": "Check for correct understanding",
              "communication": "Evaluate clarity and structure",
              "problem_solving": "Assess logical approach"
            }}
          }}
        ]
        """
        
        try:
            response = self.model.generate_content(prompt)
            response_text = response.text.strip()
            
            # Clean up response to ensure it's valid JSON
            if response_text.startswith('```json'):
                response_text = response_text[7:]
            if response_text.endswith('```'):
                response_text = response_text[:-3]
            
            questions_data = json.loads(response_text)
            
            # Validate and adjust time limits based on available time
            total_allocated_time = sum(q.get('time_limit', 300) for q in questions_data)
            if total_allocated_time > time_available:
                # Adjust time limits proportionally
                adjustment_factor = time_available / total_allocated_time
                for question in questions_data:
                    question['time_limit'] = max(120, int(question.get('time_limit', 300) * adjustment_factor))
            
            return questions_data
            
        except Exception as e:
            logger.error(f"Error generating dynamic questions: {str(e)}")
            # Return fallback questions
            return self._get_fallback_dynamic_questions(interview_type, question_count, time_available)
    
    def _get_fallback_dynamic_questions(self, interview_type: str, count: int, time_available: int) -> List[dict]:
        """Generate fallback questions when AI service fails"""
        time_per_question = max(120, time_available // count)
        
        fallback_questions = {
            'technical': [
                "Explain the difference between synchronous and asynchronous programming.",
                "How would you optimize a slow database query?",
                "Describe the SOLID principles in software development.",
                "What is the difference between REST and GraphQL?",
                "How do you handle error handling in your applications?",
                "Explain the concept of microservices architecture.",
                "What are design patterns and give examples?",
                "How do you ensure code quality in your projects?"
            ],
            'communication': [
                "Tell me about a challenging project you worked on.",
                "How do you handle conflicts in a team?",
                "Describe your approach to learning new technologies.",
                "How do you explain technical concepts to non-technical stakeholders?",
                "Tell me about a time you had to meet a tight deadline.",
                "How do you prioritize tasks when everything seems urgent?",
                "Describe your ideal work environment.",
                "How do you handle feedback and criticism?"
            ],
            'aptitude': [
                "Solve this logic puzzle: If all roses are flowers and some flowers fade quickly, what can we conclude?",
                "How would you approach solving a problem you've never encountered before?",
                "Estimate how many ping pong balls would fit in a school bus.",
                "What patterns do you see in this sequence: 2, 6, 12, 20, 30?",
                "How would you test a pen?",
                "If you could design a new app, what would it do?",
                "Explain how you would organize a library.",
                "What's the most creative solution you've come up with?"
            ]
        }
        
        questions = fallback_questions.get(interview_type, fallback_questions['technical'])[:count]
        
        return [
            {
                'text': question,
                'difficulty': 'medium',
                'category': interview_type,
                'time_limit': time_per_question,
                'expected_length': 'medium',
                'criteria': {
                    'clarity': 'Response should be clear and well-structured',
                    'depth': 'Answer should demonstrate understanding',
                    'relevance': 'Response should be relevant to the question'
                }
            }
            for question in questions
        ]
