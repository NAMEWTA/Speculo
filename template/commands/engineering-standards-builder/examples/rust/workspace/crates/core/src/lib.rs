pub fn value() -> u32 { 42 }

#[cfg(test)] mod tests { #[test] fn value_is_stable() { assert_eq!(super::value(), 42); } }
