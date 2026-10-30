import { describe, it, expect } from "vitest";
import { INSTRUMENTS, searchInstruments } from "@/lib/instruments";
import { editDistance, normalize, notCovered, search } from "@/lib/search";

const top = (q: string) => searchInstruments(q, 5).map((i) => i.symbol);

describe("search", () => {
  it("finds companies by the names people actually use", () => {
    const cases: [string, string][] = [
      ["lloyds", "LLOY"],
      ["Rolls Royce", "RR"],
      ["rolls-royce", "RR"],
      ["rollsroyce", "RR"],
      ["tesla", "TSLA"],
      ["google", "GOOGL"],
      ["facebook", "META"],
      ["instagram", "META"],
      ["barclays bank", "BARC"],
      ["vodafone", "VOD"],
      ["amazon", "AMZN"],
      ["AAPL", "AAPL"],
      ["bitcoin", "BTC"],
      ["gold", "SGLN"],
      ["s&p 500", "VUSA"],
      ["sp500", "VUSA"],
      ["ftse", "ISF"],
      ["footsie", "ISF"],
      ["m&s", "MKS"],
      ["marks and spencer", "MKS"],
      ["mcdonalds", "MCD"],
      ["McDonald's", "MCD"],
      ["sainsbury", "SBRY"],
      ["primark", "ABF"],
      ["natwest", "NWG"],
      ["coke", "KO"],
      ["jp morgan", "JPM"],
      ["plus500", "PLUS"],
      ["plus 500", "PLUS"],
      ["tsmc", "TSM"],
      ["easyjet", "EZJ"],
      ["tesla shares", "TSLA"],
      ["bp plc", "BP"],
    ];
    for (const [q, want] of cases) expect(top(q)[0], q).toBe(want);
  });

  it("forgives typos and half-typed words", () => {
    expect(top("nvidea")[0]).toBe("NVDA");
    expect(top("appel")[0]).toBe("AAPL");
    expect(top("micorsoft")[0]).toBe("MSFT");
    expect(top("vodaphone")[0]).toBe("VOD");
    expect(top("astrazenica")[0]).toBe("AZN");
    expect(top("tesl")[0]).toBe("TSLA");
    expect(top("lloy")[0]).toBe("LLOY");
  });

  it("still puts an exact ticker first", () => {
    expect(top("BA")[0]).toBe("BA");
    expect(top("ms")[0]).toBe("MS");
    expect(top("V")[0]).toBe("V");
    expect(top("t")[0]).toBe("T");
  });

  it("finds groups of things by theme or sector", () => {
    const crypto = searchInstruments("crypto", 12).map((i) => i.symbol);
    expect(crypto).toEqual(expect.arrayContaining(["BTC", "ETH", "SOL"]));
    const banks = searchInstruments("uk banks", 10).map((i) => i.symbol);
    expect(banks).toEqual(expect.arrayContaining(["LLOY", "BARC", "NWG"]));
  });

  it("returns nothing for nonsense and names what it doesn't carry", () => {
    expect(searchInstruments("zzz")).toHaveLength(0);
    expect(searchInstruments("qwxv")).toHaveLength(0);
    expect(searchInstruments("   ")).toHaveLength(0);
    expect(notCovered("bae systems")).toMatchObject({ name: "BAE Systems" });
    expect(notCovered("berkshire")).toMatchObject({ name: "Berkshire Hathaway" });
    expect(notCovered("apple")).toBeNull();
  });

  it("labels why something matched", () => {
    expect(search(INSTRUMENTS, "AAPL")[0].kind).toBe("symbol");
    expect(search(INSTRUMENTS, "nvidea")[0].kind).toBe("typo");
  });

  it("normalises punctuation and counts typos", () => {
    expect(normalize("Rolls-Royce Holdings plc")).toBe("rolls royce holdings plc");
    expect(normalize("S&P 500")).toBe("s and p 500");
    expect(normalize("Nestlé")).toBe("nestle");
    expect(editDistance("appel", "apple")).toBe(1);
    expect(editDistance("nvidea", "nvidia")).toBe(1);
    expect(editDistance("tesco", "tesla")).toBe(2);
  });
});
