"use client";

import React from "react";

export default function SearchStrip() {
  return (
    // 紧贴导航下方的一条容器条，背景透明，仅负责留白与对齐
    <section className="w-full">
      <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
        {/* 上下留白与视觉间距 */}
        <div className="py-0 md:py-1" />
        {/* 搜索表单：居中、定宽（约 640–720px） */}
        <form action="/search" method="GET" className="relative mx-auto max-w-2xl md:max-w-3xl">
          {/* 输入框（椭圆、细边框、浅阴影） */}
          <input
            type="text"
            name="q"
            autoComplete="off"
            placeholder="Search for a product or brand"
            className="h-12 md:h-14 w-full rounded-full
                       border border-neutral-300/80 dark:border-neutral-700/80
                       bg-white dark:bg-neutral-900/80
                       pl-5 pr-14 text-[15px] md:text-base
                       placeholder:text-neutral-400
                       shadow-sm
                       outline-none focus:ring-2
                       focus:ring-black/10 dark:focus:ring-white/20
                       focus:border-neutral-400 dark:focus:border-neutral-600"
          />

          {/* 右侧内嵌的放大镜按钮（椭圆内悬浮的圆形按钮） */}
          <button
            type="submit"
            aria-label="Search"
            className="absolute right-1 top-1/2 -translate-y-1/2
                       h-10 w-10 md:h-12 md:w-12
                       rounded-full
                       bg-black text-white dark:bg-white dark:text-black
                       flex items-center justify-center
                       shadow-sm hover:opacity-90 transition"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-5 w-5 md:h-6 md:w-6"
            >
              <path
                fill="currentColor"
                d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79L20 21.5 21.5 20l-6-6zM4 9.5C4 6.46 6.46 4 9.5 4S15 6.46 15 9.5 12.54 15 9.5 15 4 12.54 4 9.5z"
              />
            </svg>
          </button>
        </form>

        {/* 可选：热门关键词（MYER 也会在附近给一些入口） */}
        {/* <div className="mx-auto mt-3 hidden max-w-3xl justify-center gap-2 text-xs text-neutral-600 md:flex">
          <a href="/women" className="rounded-full bg-neutral-100 px-3 py-1 dark:bg-neutral-800">Women</a>
          <a href="/men" className="rounded-full bg-neutral-100 px-3 py-1 dark:bg-neutral-800">Men</a>
          <a href="/sale" className="rounded-full bg-neutral-100 px-3 py-1 dark:bg-neutral-800">Sale</a>
        </div> */}
      </div>
    </section>
  );
}
