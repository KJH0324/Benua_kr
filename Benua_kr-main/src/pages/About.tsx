import { motion } from "motion/react";

export default function About() {
  return (
    <div className="pt-[120px] pb-24 px-6 md:px-[60px] max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-12"
      >
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-venuea-dark">
          Benua: 공간의 여백을 채우는 오브제
        </h1>
        <div className="aspect-video rounded-2xl overflow-hidden bg-gray-100">
          <img
            src="https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&q=80&w=1200"
            alt="Benua Brand Story"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="space-y-6 text-base text-gray-600 leading-relaxed font-light">
          <p>
            <strong>베뉴아(Benua)</strong>는 일상적인 공간을 갤러리로 바꾸는 조형적 오브제를 큐레이션합니다.
          </p>
          <p>
            빛과 그림자가 머무는 세라믹의 질감, 절제된 실루엣의 글래스 오브제, 공간의 정취를 완성하는 아로마 오브제까지 시간이 흘러도 변치 않는 미학을 제안합니다.
          </p>
        </div>
      </motion.div>
    </div>
  );
}