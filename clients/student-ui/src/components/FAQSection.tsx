import React, { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSectionProps {
  title?: string;
  description?: string;
  faqs: FAQItem[];
}

const FAQSection: React.FC<FAQSectionProps> = ({ 
  title = "Frequently Asked Questions",
  description = "Everything you need to know about TalentLens",
  faqs 
}) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">{title}</h2>
          <p className="text-xl text-gray-600">{description}</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
            >
              <button
                className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 focus:outline-none focus:bg-gray-50 transition-colors"
                onClick={() => toggleFAQ(index)}
              >
                <span className="font-semibold text-gray-900 pr-4">{faq.question}</span>
                <div className={`transform transition-transform duration-200 ${openIndex === index ? 'rotate-180' : ''}`}>
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              
              <div
                className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${
                  openIndex === index ? 'pb-4 max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <div className="bg-blue-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Still have questions?</h3>
            <p className="text-blue-700 mb-4">Our support team is here to help you get started.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a 
                href="mailto:support@talentlens.com" 
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                📧 Email Support
              </a>
              <a 
                href="#" 
                className="inline-flex items-center px-4 py-2 bg-white text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
              >
                💬 Live Chat
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
